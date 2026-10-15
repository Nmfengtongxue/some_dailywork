#!/usr/bin/env python3
"""PNG 2026-06-15 报表逐人基准数据（与图片序号一一对应）"""
from datetime import datetime, timedelta, timezone

CN_TZ = timezone(timedelta(hours=8))
import json
import os
import sys

# 来源：2026-06-16  618业绩报表_2026-06-15.png 逐行核对
BASELINE_BY_SEQ = {
    1: 0, 2: 10370, 3: 1854, 5: 1168,
    6: 5926, 7: 2253, 8: 2472, 9: 2954, 10: 2472, 11: 618, 12: 618, 13: 618,
    14: 0, 15: 4808, 16: 5908, 17: 4944, 18: 4944, 19: 1854, 20: 0, 21: 1236, 22: 0,
    24: 3090, 25: 618, 26: 1168, 27: 0, 28: 0, 29: 0,
    30: 3090, 31: 618, 32: 1168, 33: 0, 34: 2472, 35: 618, 36: 618,
    37: 0, 38: 3090, 39: 618, 40: 0, 41: 0, 42: 618, 43: 618,
    44: 0, 45: 0, 46: 0, 47: 618, 48: 618,
    49: 0, 50: 0, 51: 0, 52: 0, 53: 0, 54: 0, 55: 0,
    56: 0, 57: 0, 58: 0,
}

WEB_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(WEB_DIR, 'data')


def apply_baseline(data):
    by_dept = {}
    for emp in data['employees']:
        seq = emp.get('seq')
        if seq not in BASELINE_BY_SEQ:
            raise KeyError(f'员工 {emp["name"]} 序号 {seq} 无基准数据')
        emp['initialCompleted'] = BASELINE_BY_SEQ[seq]
        emp.pop('snapshotCompleted', None)
        by_dept.setdefault(emp['department'], {'t': 0, 'c': 0})
        by_dept[emp['department']]['t'] += emp['target']
        by_dept[emp['department']]['c'] += emp['initialCompleted']

    return by_dept


def build_snapshot(data):
    synced_at = datetime.now(CN_TZ).isoformat(timespec='seconds')
    return {
        'campaign': data.get('campaign', '2026年618活动'),
        'departments': data.get('departments', []),
        'employees': data['employees'],
        'records': [],
        'dailySnapshots': {},
        'syncedFrom': '2026-06-16  618业绩报表_2026-06-15.png',
        'syncedAt': synced_at,
        'reportDate': '2026-06-15',
        'baselineBySeq': BASELINE_BY_SEQ,
    }


def sync_all():
    with open(os.path.join(DATA_DIR, 'employees.json'), encoding='utf-8') as f:
        data = json.load(f)

    by_dept = apply_baseline(data)
    snapshot = build_snapshot(data)

    for path in (os.path.join(DATA_DIR, 'employees.json'), os.path.join(DATA_DIR, 'latest.json')):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(snapshot if path.endswith('latest.json') else data, f, ensure_ascii=False, indent=2)

    sales = by_dept['销售部']['c']
    admin = by_dept['行政部']['c']
    med = by_dept['医疗中心']['c']
    total = sales + admin + med

    assert sales == 13392, sales
    assert admin == 17931, admin
    assert med == 43334, med
    assert total == 74657, total

    return {
        'sales': sales,
        'admin': admin,
        'medical': med,
        'total': total,
        'syncedAt': snapshot['syncedAt'],
    }


if __name__ == '__main__':
    result = sync_all()
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if len(sys.argv) > 1 and sys.argv[1] == '--excel':
        from sync_excel import sync_excel
        with open(os.path.join(DATA_DIR, 'latest.json'), encoding='utf-8') as f:
            latest = json.load(f)
        print(json.dumps(sync_excel(latest), ensure_ascii=False, indent=2))
