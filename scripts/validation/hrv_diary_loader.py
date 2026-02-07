#!/usr/bin/env python3
"""
HRV + Sleep Diary Dataset Loader

Loads and preprocesses the Nature Scientific Data 2025 dataset
for validation of SleepCore HRV and sleep diary modules.

Dataset: https://doi.org/10.6084/m9.figshare.28509740
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime


@dataclass
class HRVDiaryDataset:
    """Container for HRV + Sleep Diary dataset"""

    survey: pd.DataFrame  # Demographics + clinical questionnaires
    sleep_diary: pd.DataFrame  # Daily sleep diary entries
    hrv_features: pd.DataFrame  # 5-minute HRV segments
    participant_ids: List[str]  # Unique participant IDs

    @property
    def n_participants(self) -> int:
        return len(self.participant_ids)

    @property
    def n_diary_entries(self) -> int:
        return len(self.sleep_diary)

    @property
    def n_hrv_segments(self) -> int:
        return len(self.hrv_features)


class HRVDiaryLoader:
    """
    Loader for HRV + Sleep Diary dataset from Nature Scientific Data 2025.

    Actual file structure:
        data_dir/
        ├── survey.csv          # Demographics + ISI, PHQ9, GAD7
        ├── sleep_diary.csv     # Daily sleep diary
        └── sensor_hrv.csv      # HRV features (5-min segments)
    """

    EXPECTED_FILES = ['survey.csv', 'sleep_diary.csv', 'sensor_hrv.csv']

    # Column mappings from actual data to standardized names
    SURVEY_COLUMNS = {
        'deviceId': 'participant_id',
        'ISI_1': 'isi_t0',
        'ISI_2': 'isi_t1',
        'ISI_F': 'isi_t2',
        'PHQ9_1': 'phq9_t0',
        'PHQ9_2': 'phq9_t1',
        'PHQ9_F': 'phq9_t2',
        'GAD7_1': 'gad7_t0',
        'GAD7_2': 'gad7_t1',
        'GAD7_F': 'gad7_t2',
        'sex': 'gender',
    }

    DIARY_COLUMNS = {
        'userId': 'participant_id',
        'sleep_efficiency': 'sleep_efficiency',
        'sleep_latency': 'sol',
        'waso': 'waso',
        'sleep_duration': 'tst',
        'in_bed_duration': 'tib',
    }

    HRV_COLUMNS = {
        'deviceId': 'participant_id',
        'ts_start': 'timestamp',
        'rmssd': 'rmssd',
        'sdnn': 'sdnn',
        'lf': 'lf_power',
        'hf': 'hf_power',
        'lf/hf': 'lf_hf_ratio',
    }

    # Clinical questionnaire thresholds
    ISI_THRESHOLDS = {
        'none': (0, 7),
        'subthreshold': (8, 14),
        'moderate': (15, 21),
        'severe': (22, 28)
    }

    def __init__(self, data_dir: str):
        """
        Initialize loader with data directory path.

        Args:
            data_dir: Path to directory containing CSV files
        """
        self.data_dir = Path(data_dir)
        self._validate_data_dir()

    def _validate_data_dir(self) -> None:
        """Validate that data directory exists and contains expected files."""
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {self.data_dir}")

        missing = []
        for f in self.EXPECTED_FILES:
            if not (self.data_dir / f).exists():
                missing.append(f)

        if missing:
            raise FileNotFoundError(
                f"Missing files in {self.data_dir}: {missing}\n"
                f"Download from: https://doi.org/10.6084/m9.figshare.28509740"
            )

    def load(self) -> HRVDiaryDataset:
        """
        Load all dataset files.

        Returns:
            HRVDiaryDataset containing all loaded data
        """
        survey = self._load_survey()
        sleep_diary = self._load_sleep_diary()
        hrv_features = self._load_hrv_features()

        participant_ids = survey['participant_id'].unique().tolist()

        return HRVDiaryDataset(
            survey=survey,
            sleep_diary=sleep_diary,
            hrv_features=hrv_features,
            participant_ids=participant_ids
        )

    def _load_survey(self) -> pd.DataFrame:
        """Load and preprocess survey data (demographics + questionnaires)."""
        df = pd.read_csv(self.data_dir / 'survey.csv')

        # Rename columns to standardized names
        df = df.rename(columns=self.SURVEY_COLUMNS)

        # Add severity classifications
        for timepoint in ['t0', 't1', 't2']:
            isi_col = f'isi_{timepoint}'
            if isi_col in df.columns:
                df[f'isi_severity_{timepoint}'] = df[isi_col].apply(
                    self._classify_isi
                )

        # Convert gender (1=male, 2=female in original data)
        if 'gender' in df.columns:
            df['gender'] = df['gender'].map({1: 'male', 2: 'female'})

        return df

    def _load_sleep_diary(self) -> pd.DataFrame:
        """Load and preprocess sleep diary data."""
        df = pd.read_csv(self.data_dir / 'sleep_diary.csv')

        # Rename columns
        df = df.rename(columns=self.DIARY_COLUMNS)

        # Parse date
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])

        # Convert sleep_efficiency from ratio to percentage if needed
        if 'sleep_efficiency' in df.columns:
            # Data is already in ratio form (0-1), convert to percentage
            if df['sleep_efficiency'].max() <= 1:
                df['sleep_efficiency'] = df['sleep_efficiency'] * 100

        # Convert durations from hours to minutes
        for col in ['tst', 'tib', 'sol']:
            if col in df.columns:
                # Check if values are in hours (typically < 24)
                if df[col].max() < 24:
                    df[f'{col}_minutes'] = df[col] * 60

        return df

    def _load_hrv_features(self) -> pd.DataFrame:
        """Load and preprocess HRV features."""
        df = pd.read_csv(self.data_dir / 'sensor_hrv.csv')

        # Rename columns
        df = df.rename(columns=self.HRV_COLUMNS)

        # Convert timestamp from milliseconds to datetime
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['hour'] = df['timestamp'].dt.hour
            df['date'] = df['timestamp'].dt.date
            df['time_category'] = df['hour'].apply(self._categorize_time)

        return df

    @staticmethod
    def _classify_isi(score: float) -> str:
        """Classify ISI score into severity category."""
        if pd.isna(score):
            return 'unknown'
        score = int(score)
        if score <= 7:
            return 'none'
        elif score <= 14:
            return 'subthreshold'
        elif score <= 21:
            return 'moderate'
        else:
            return 'severe'

    @staticmethod
    def _categorize_time(hour: int) -> str:
        """Categorize hour into time of day."""
        if 6 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 18:
            return 'afternoon'
        elif 18 <= hour < 22:
            return 'evening'
        else:
            return 'night'


def get_participant_summary(dataset: HRVDiaryDataset, participant_id: str) -> Dict:
    """
    Get summary statistics for a single participant.
    """
    survey = dataset.survey[dataset.survey['participant_id'] == participant_id]
    diary = dataset.sleep_diary[dataset.sleep_diary['participant_id'] == participant_id]
    hrv = dataset.hrv_features[dataset.hrv_features['participant_id'] == participant_id]

    if survey.empty:
        return {'error': f'Participant {participant_id} not found'}

    summary = {
        'participant_id': participant_id,
        'n_diary_entries': len(diary),
        'n_hrv_segments': len(hrv),
    }

    row = survey.iloc[0]
    if 'age' in survey.columns:
        summary['age'] = row['age']
    if 'gender' in survey.columns:
        summary['gender'] = row['gender']

    for t in ['t0', 't1', 't2']:
        col = f'isi_{t}'
        if col in survey.columns:
            summary[col] = row[col]

    if 'sleep_efficiency' in diary.columns:
        summary['mean_sleep_efficiency'] = diary['sleep_efficiency'].mean()

    if 'rmssd' in hrv.columns:
        summary['mean_rmssd'] = hrv['rmssd'].mean()

    return summary


def compute_hrv_sleep_correlation(dataset: HRVDiaryDataset) -> pd.DataFrame:
    """
    Compute correlation between HRV features and sleep quality.
    """
    results = []

    for pid in dataset.participant_ids:
        diary = dataset.sleep_diary[dataset.sleep_diary['participant_id'] == pid].copy()
        hrv = dataset.hrv_features[dataset.hrv_features['participant_id'] == pid].copy()

        if diary.empty or hrv.empty:
            continue

        if 'date' not in hrv.columns or 'date' not in diary.columns:
            continue

        # Night HRV (22:00 - 06:00)
        if 'time_category' in hrv.columns:
            night_hrv = hrv[hrv['time_category'] == 'night']
        else:
            night_hrv = hrv

        if night_hrv.empty:
            continue

        # Aggregate HRV by date
        daily_hrv = night_hrv.groupby('date').agg({
            'rmssd': 'mean'
        }).reset_index()

        # Prepare diary dates
        diary['date_key'] = diary['date'].dt.date

        # Merge
        merged = diary.merge(
            daily_hrv,
            left_on='date_key',
            right_on='date',
            how='inner',
            suffixes=('', '_hrv')
        )

        if len(merged) >= 3 and 'sleep_efficiency' in merged.columns:
            corr = merged['rmssd'].corr(merged['sleep_efficiency'])
            if not pd.isna(corr):
                results.append({
                    'participant_id': pid,
                    'n_days': len(merged),
                    'rmssd_sleep_quality_corr': corr,
                    'mean_rmssd': merged['rmssd'].mean(),
                    'mean_sleep_efficiency': merged['sleep_efficiency'].mean()
                })

    return pd.DataFrame(results)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Load HRV + Sleep Diary dataset')
    parser.add_argument(
        '--data-dir',
        type=str,
        default='data/datasets/hrv-diary',
        help='Path to dataset directory'
    )
    parser.add_argument(
        '--summary',
        action='store_true',
        help='Print dataset summary'
    )
    args = parser.parse_args()

    try:
        loader = HRVDiaryLoader(args.data_dir)
        dataset = loader.load()

        print(f"Dataset loaded successfully!")
        print(f"  Participants: {dataset.n_participants}")
        print(f"  Diary entries: {dataset.n_diary_entries}")
        print(f"  HRV segments: {dataset.n_hrv_segments}")

        if args.summary:
            # ISI distribution at baseline
            if 'isi_severity_t0' in dataset.survey.columns:
                print("\nISI Severity at Baseline:")
                print(dataset.survey['isi_severity_t0'].value_counts())

            # Sample participant
            pid = dataset.participant_ids[0]
            print(f"\nSample participant ({pid}):")
            summary = get_participant_summary(dataset, pid)
            for k, v in summary.items():
                print(f"  {k}: {v}")

    except FileNotFoundError as e:
        print(f"Error: {e}")
