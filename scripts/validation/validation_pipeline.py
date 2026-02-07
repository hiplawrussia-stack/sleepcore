#!/usr/bin/env python3
"""
SleepCore Validation Pipeline

Validates SleepCore models and algorithms against public datasets:
1. HRV + Sleep Diary (Nature Scientific Data 2025)
2. MESA Sleep (NSRR)

Usage:
    python validation_pipeline.py --dataset hrv-diary --module hrv
    python validation_pipeline.py --dataset mesa --module pat
    python validation_pipeline.py --all
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import numpy as np

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@dataclass
class ValidationResult:
    """Result of a validation run"""
    module: str
    dataset: str
    timestamp: str
    status: str  # 'passed', 'failed', 'skipped'
    metrics: Dict[str, float]
    thresholds: Dict[str, float]
    passed_checks: List[str]
    failed_checks: List[str]
    warnings: List[str]
    sample_size: int
    details: Optional[Dict[str, Any]] = None


class ValidationPipeline:
    """
    Main validation pipeline for SleepCore.

    Validates:
    - HRV module: RMSSD correlation with sleep quality
    - Sleep Diary: SE/SOL/WASO calculations
    - PAT model: Actigraphy predictions vs PSG
    - ISI: Score trajectory predictions
    """

    # Validation thresholds based on literature
    THRESHOLDS = {
        'hrv': {
            'rmssd_sleep_quality_corr_min': 0.3,  # Moderate correlation expected
            'rmssd_mean_range': (20, 100),  # ms, healthy adults
            'coverage_min': 0.8,  # 80% of participants should have valid data
        },
        'sleep_diary': {
            'se_range': (0, 100),  # Percentage
            'sol_max': 120,  # Minutes, reasonable max
            'waso_max': 180,  # Minutes, reasonable max
            'consistency_check': True,
        },
        'pat': {
            'accuracy_min': 0.7,  # 70% epoch accuracy vs PSG
            'sensitivity_min': 0.85,  # Sleep detection
            'specificity_min': 0.4,  # Wake detection (known limitation)
            'tst_mae_max': 30,  # Minutes, Total Sleep Time
        },
        'isi': {
            'mcid': 6,  # Minimal Clinically Important Difference
            'remission_threshold': 7,  # ISI <= 7 = remission
            'trajectory_correlation_min': 0.5,
        }
    }

    def __init__(self, data_dir: str = 'data/datasets', output_dir: str = 'data/validation_results'):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.results: List[ValidationResult] = []

    def run_all(self) -> List[ValidationResult]:
        """Run all validation modules."""
        print("=" * 60)
        print("SleepCore Validation Pipeline")
        print("=" * 60)
        print()

        modules = [
            ('hrv', 'hrv-diary'),
            ('sleep_diary', 'hrv-diary'),
            ('isi', 'hrv-diary'),
            ('pat', 'mesa'),
        ]

        for module, dataset in modules:
            result = self.validate_module(module, dataset)
            self.results.append(result)
            self._print_result(result)

        self._save_results()
        self._print_summary()

        return self.results

    def validate_module(self, module: str, dataset: str) -> ValidationResult:
        """
        Validate a specific module against a dataset.

        Args:
            module: Module name ('hrv', 'sleep_diary', 'pat', 'isi')
            dataset: Dataset name ('hrv-diary', 'mesa')

        Returns:
            ValidationResult
        """
        print(f"\n[{module.upper()}] Validating against {dataset}...")

        dataset_path = self.data_dir / dataset

        if not dataset_path.exists():
            return ValidationResult(
                module=module,
                dataset=dataset,
                timestamp=datetime.now().isoformat(),
                status='skipped',
                metrics={},
                thresholds=self.THRESHOLDS.get(module, {}),
                passed_checks=[],
                failed_checks=[],
                warnings=[f'Dataset not found: {dataset_path}'],
                sample_size=0
            )

        # Dispatch to specific validation method
        if module == 'hrv':
            return self._validate_hrv(dataset_path)
        elif module == 'sleep_diary':
            return self._validate_sleep_diary(dataset_path)
        elif module == 'isi':
            return self._validate_isi(dataset_path)
        elif module == 'pat':
            return self._validate_pat(dataset_path)
        else:
            return ValidationResult(
                module=module,
                dataset=dataset,
                timestamp=datetime.now().isoformat(),
                status='skipped',
                metrics={},
                thresholds={},
                passed_checks=[],
                failed_checks=[],
                warnings=[f'Unknown module: {module}'],
                sample_size=0
            )

    def _validate_hrv(self, dataset_path: Path) -> ValidationResult:
        """Validate HRV module."""
        from hrv_diary_loader import HRVDiaryLoader, compute_hrv_sleep_correlation

        passed = []
        failed = []
        warnings = []
        metrics = {}

        try:
            loader = HRVDiaryLoader(str(dataset_path))
            dataset = loader.load()

            # Compute correlations
            corr_df = compute_hrv_sleep_correlation(dataset)

            if len(corr_df) == 0:
                return ValidationResult(
                    module='hrv',
                    dataset='hrv-diary',
                    timestamp=datetime.now().isoformat(),
                    status='failed',
                    metrics={},
                    thresholds=self.THRESHOLDS['hrv'],
                    passed_checks=[],
                    failed_checks=['No valid correlation data computed'],
                    warnings=[],
                    sample_size=0
                )

            # Metric 1: Mean correlation
            mean_corr = corr_df['rmssd_sleep_quality_corr'].mean()
            metrics['mean_rmssd_sleep_quality_corr'] = mean_corr

            threshold = self.THRESHOLDS['hrv']['rmssd_sleep_quality_corr_min']
            if mean_corr >= threshold:
                passed.append(f'RMSSD-Sleep Quality correlation >= {threshold}: {mean_corr:.3f}')
            else:
                failed.append(f'RMSSD-Sleep Quality correlation < {threshold}: {mean_corr:.3f}')

            # Metric 2: RMSSD range
            mean_rmssd = corr_df['mean_rmssd'].mean()
            metrics['mean_rmssd'] = mean_rmssd

            rmssd_range = self.THRESHOLDS['hrv']['rmssd_mean_range']
            if rmssd_range[0] <= mean_rmssd <= rmssd_range[1]:
                passed.append(f'Mean RMSSD in expected range {rmssd_range}: {mean_rmssd:.1f}ms')
            else:
                warnings.append(f'Mean RMSSD outside expected range {rmssd_range}: {mean_rmssd:.1f}ms')

            # Metric 3: Coverage
            coverage = len(corr_df) / dataset.n_participants
            metrics['data_coverage'] = coverage

            coverage_min = self.THRESHOLDS['hrv']['coverage_min']
            if coverage >= coverage_min:
                passed.append(f'Data coverage >= {coverage_min:.0%}: {coverage:.0%}')
            else:
                warnings.append(f'Data coverage < {coverage_min:.0%}: {coverage:.0%}')

            status = 'passed' if len(failed) == 0 else 'failed'

            return ValidationResult(
                module='hrv',
                dataset='hrv-diary',
                timestamp=datetime.now().isoformat(),
                status=status,
                metrics=metrics,
                thresholds=self.THRESHOLDS['hrv'],
                passed_checks=passed,
                failed_checks=failed,
                warnings=warnings,
                sample_size=len(corr_df),
                details={'correlation_stats': corr_df.describe().to_dict()}
            )

        except FileNotFoundError as e:
            return ValidationResult(
                module='hrv',
                dataset='hrv-diary',
                timestamp=datetime.now().isoformat(),
                status='skipped',
                metrics={},
                thresholds=self.THRESHOLDS['hrv'],
                passed_checks=[],
                failed_checks=[],
                warnings=[str(e)],
                sample_size=0
            )

    def _validate_sleep_diary(self, dataset_path: Path) -> ValidationResult:
        """Validate sleep diary parsing and calculations."""
        from hrv_diary_loader import HRVDiaryLoader

        passed = []
        failed = []
        warnings = []
        metrics = {}

        try:
            loader = HRVDiaryLoader(str(dataset_path))
            dataset = loader.load()

            diary = dataset.sleep_diary

            # Check SE calculation
            if 'sleep_efficiency' in diary.columns:
                se_mean = diary['sleep_efficiency'].mean()
                se_std = diary['sleep_efficiency'].std()
                metrics['mean_se'] = se_mean
                metrics['std_se'] = se_std

                se_range = self.THRESHOLDS['sleep_diary']['se_range']
                invalid_se = ((diary['sleep_efficiency'] < se_range[0]) |
                             (diary['sleep_efficiency'] > se_range[1])).sum()

                if invalid_se == 0:
                    passed.append('All SE values in valid range (0-100%)')
                else:
                    failed.append(f'{invalid_se} SE values out of range')

            # Check SOL if present
            if 'time_to_fall_asleep' in diary.columns:
                sol_max = diary['time_to_fall_asleep'].max()
                metrics['max_sol'] = sol_max

                if sol_max <= self.THRESHOLDS['sleep_diary']['sol_max']:
                    passed.append(f'Max SOL within reasonable range: {sol_max} min')
                else:
                    warnings.append(f'Some SOL values very high: max={sol_max} min')

            # Check data completeness
            n_entries = len(diary)
            n_participants = dataset.n_participants
            avg_entries = n_entries / n_participants if n_participants > 0 else 0
            metrics['avg_entries_per_participant'] = avg_entries

            # Expected ~28 entries for 4-week study
            if avg_entries >= 20:
                passed.append(f'Good diary completion: {avg_entries:.1f} entries/participant')
            else:
                warnings.append(f'Low diary completion: {avg_entries:.1f} entries/participant')

            status = 'passed' if len(failed) == 0 else 'failed'

            return ValidationResult(
                module='sleep_diary',
                dataset='hrv-diary',
                timestamp=datetime.now().isoformat(),
                status=status,
                metrics=metrics,
                thresholds=self.THRESHOLDS['sleep_diary'],
                passed_checks=passed,
                failed_checks=failed,
                warnings=warnings,
                sample_size=n_entries
            )

        except FileNotFoundError as e:
            return ValidationResult(
                module='sleep_diary',
                dataset='hrv-diary',
                timestamp=datetime.now().isoformat(),
                status='skipped',
                metrics={},
                thresholds=self.THRESHOLDS['sleep_diary'],
                passed_checks=[],
                failed_checks=[],
                warnings=[str(e)],
                sample_size=0
            )

    def _validate_isi(self, dataset_path: Path) -> ValidationResult:
        """Validate ISI trajectory analysis."""
        from hrv_diary_loader import HRVDiaryLoader

        passed = []
        failed = []
        warnings = []
        metrics = {}

        try:
            loader = HRVDiaryLoader(str(dataset_path))
            dataset = loader.load()

            survey = dataset.survey

            # Check ISI data availability
            isi_cols = [c for c in survey.columns if c.startswith('isi_t')]
            if len(isi_cols) < 2:
                return ValidationResult(
                    module='isi',
                    dataset='hrv-diary',
                    timestamp=datetime.now().isoformat(),
                    status='skipped',
                    metrics={},
                    thresholds=self.THRESHOLDS['isi'],
                    passed_checks=[],
                    failed_checks=[],
                    warnings=['Insufficient ISI timepoints for trajectory analysis'],
                    sample_size=0
                )

            # ISI change from t0 to t2
            if 'isi_t0' in survey.columns and 'isi_t2' in survey.columns:
                valid = survey[['isi_t0', 'isi_t2']].dropna()
                isi_change = valid['isi_t0'] - valid['isi_t2']

                metrics['mean_isi_change'] = isi_change.mean()
                metrics['std_isi_change'] = isi_change.std()
                metrics['n_improved'] = (isi_change > 0).sum()
                metrics['n_worsened'] = (isi_change < 0).sum()

                # Check for meaningful change (healthy sample, expect minimal change)
                if abs(isi_change.mean()) < 3:
                    passed.append('ISI trajectory stable (healthy sample)')
                else:
                    warnings.append(f'Unexpected ISI change in healthy sample: {isi_change.mean():.1f}')

            # Severity distribution at baseline
            if 'isi_severity_t0' in survey.columns:
                severity_dist = survey['isi_severity_t0'].value_counts(normalize=True)
                metrics['baseline_severity_distribution'] = severity_dist.to_dict()

                # Healthy sample should be mostly 'none' or 'subthreshold'
                healthy_pct = severity_dist.get('none', 0) + severity_dist.get('subthreshold', 0)
                if healthy_pct >= 0.8:
                    passed.append(f'Sample mostly healthy (no/subthreshold insomnia): {healthy_pct:.0%}')
                else:
                    warnings.append(f'Mixed insomnia severity in sample: {healthy_pct:.0%} healthy')

            status = 'passed' if len(failed) == 0 else 'failed'

            return ValidationResult(
                module='isi',
                dataset='hrv-diary',
                timestamp=datetime.now().isoformat(),
                status=status,
                metrics=metrics,
                thresholds=self.THRESHOLDS['isi'],
                passed_checks=passed,
                failed_checks=failed,
                warnings=warnings,
                sample_size=len(survey)
            )

        except FileNotFoundError as e:
            return ValidationResult(
                module='isi',
                dataset='hrv-diary',
                timestamp=datetime.now().isoformat(),
                status='skipped',
                metrics={},
                thresholds=self.THRESHOLDS['isi'],
                passed_checks=[],
                failed_checks=[],
                warnings=[str(e)],
                sample_size=0
            )

    def _validate_pat(self, dataset_path: Path) -> ValidationResult:
        """Validate PAT (Pretrained Actigraphy Transformer) model."""
        # MESA dataset requires DUA - check if data exists
        actigraphy_dir = dataset_path / 'actigraphy'
        psg_dir = dataset_path / 'polysomnography'

        if not actigraphy_dir.exists() or not psg_dir.exists():
            return ValidationResult(
                module='pat',
                dataset='mesa',
                timestamp=datetime.now().isoformat(),
                status='skipped',
                metrics={},
                thresholds=self.THRESHOLDS['pat'],
                passed_checks=[],
                failed_checks=[],
                warnings=[
                    'MESA data not found. Complete Data Use Agreement at:',
                    'https://sleepdata.org/data/requests/mesa/start'
                ],
                sample_size=0
            )

        # TODO: Implement PAT validation when MESA data is available
        return ValidationResult(
            module='pat',
            dataset='mesa',
            timestamp=datetime.now().isoformat(),
            status='skipped',
            metrics={},
            thresholds=self.THRESHOLDS['pat'],
            passed_checks=[],
            failed_checks=[],
            warnings=['PAT validation not yet implemented'],
            sample_size=0
        )

    def _print_result(self, result: ValidationResult) -> None:
        """Print a single validation result."""
        status_symbol = {
            'passed': '[OK]',
            'failed': '[FAIL]',
            'skipped': '[SKIP]'
        }

        print(f"\n{status_symbol.get(result.status, '?')} [{result.module.upper()}] {result.status.upper()}")
        print(f"   Dataset: {result.dataset}")
        print(f"   Sample size: {result.sample_size}")

        if result.passed_checks:
            print("   Passed:")
            for check in result.passed_checks:
                print(f"     + {check}")

        if result.failed_checks:
            print("   Failed:")
            for check in result.failed_checks:
                print(f"     - {check}")

        if result.warnings:
            print("   Warnings:")
            for warning in result.warnings:
                print(f"     ! {warning}")

    def _print_summary(self) -> None:
        """Print validation summary."""
        print("\n" + "=" * 60)
        print("VALIDATION SUMMARY")
        print("=" * 60)

        passed = sum(1 for r in self.results if r.status == 'passed')
        failed = sum(1 for r in self.results if r.status == 'failed')
        skipped = sum(1 for r in self.results if r.status == 'skipped')

        print(f"\n  Passed:  {passed}")
        print(f"  Failed:  {failed}")
        print(f"  Skipped: {skipped}")

        if failed == 0 and passed > 0:
            print("\n[SUCCESS] All validations passed!")
        elif failed > 0:
            print(f"\n[FAILED] {failed} validation(s) failed")
        else:
            print("\n[SKIPPED] No validations completed (datasets not found)")

        print(f"\nResults saved to: {self.output_dir}")

    def _save_results(self) -> None:
        """Save validation results to JSON."""
        output_file = self.output_dir / f"validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        results_dict = {
            'timestamp': datetime.now().isoformat(),
            'results': [asdict(r) for r in self.results],
            'summary': {
                'passed': sum(1 for r in self.results if r.status == 'passed'),
                'failed': sum(1 for r in self.results if r.status == 'failed'),
                'skipped': sum(1 for r in self.results if r.status == 'skipped'),
            }
        }

        with open(output_file, 'w') as f:
            json.dump(results_dict, f, indent=2, default=str)

        print(f"\nResults saved to: {output_file}")


def main():
    parser = argparse.ArgumentParser(description='SleepCore Validation Pipeline')
    parser.add_argument(
        '--dataset',
        type=str,
        choices=['hrv-diary', 'mesa'],
        help='Dataset to validate against'
    )
    parser.add_argument(
        '--module',
        type=str,
        choices=['hrv', 'sleep_diary', 'isi', 'pat'],
        help='Module to validate'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Run all validations'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default='data/datasets',
        help='Path to datasets directory'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='data/validation_results',
        help='Path to save results'
    )

    args = parser.parse_args()

    pipeline = ValidationPipeline(
        data_dir=args.data_dir,
        output_dir=args.output_dir
    )

    if args.all:
        pipeline.run_all()
    elif args.dataset and args.module:
        result = pipeline.validate_module(args.module, args.dataset)
        pipeline.results.append(result)
        pipeline._print_result(result)
        pipeline._save_results()
    else:
        parser.print_help()
        print("\nExamples:")
        print("  python validation_pipeline.py --all")
        print("  python validation_pipeline.py --dataset hrv-diary --module hrv")


if __name__ == '__main__':
    main()
