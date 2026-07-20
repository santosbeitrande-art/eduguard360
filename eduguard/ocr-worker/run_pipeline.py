import uuid
import json
from pathlib import Path
import subprocess
import os
from PIL import Image
import re

ROOT = Path(__file__).resolve().parents[1]
JOBS_DIR = ROOT / 'eduguard_jobs'
if not JOBS_DIR.exists():
    JOBS_DIR.mkdir(parents=True)

# Use test_doc.png
img_path = Path(__file__).parent / 'test_doc.png'
if not img_path.exists():
    print('test_doc.png not found')
    raise SystemExit(1)

job_id = str(uuid.uuid4())
job = {
    'id': job_id,
    'filePath': str(img_path.resolve()),
    'status': 'queued',
    'createdAt': None
}
job['createdAt'] = __import__('datetime').datetime.utcnow().isoformat()
job_file = JOBS_DIR / f'{job_id}.json'
job_file.write_text(json.dumps(job, indent=2, ensure_ascii=False))
print('Wrote job', job_file)

# Run worker.py on file
proc = subprocess.run(['python', 'worker.py', str(img_path)], cwd=str(img_path.parent), capture_output=True, text=True)
print('worker.py stdout:', proc.stdout)
print('worker.py stderr:', proc.stderr)
try:
    res = json.loads(proc.stdout)
except Exception as e:
    res = {'error': 'invalid worker output', 'raw': proc.stdout}

# Forensic analysis (python version)
forensic = {}
try:
    st = img_path.stat()
    forensic['metadata'] = {
        'size': st.st_size,
        'ctime': st.st_ctime,
        'mtime': st.st_mtime,
        'ext': img_path.suffix.lower()
    }
    try:
        with Image.open(img_path) as im:
            forensic['metadata']['dimensions'] = im.size
    except Exception as e:
        forensic['metadata']['dimensionsError'] = str(e)

    text = res.get('text','') or ''
    words = re.findall(r"\w+", text)
    uniq = set(w.lower() for w in words)
    uniq_ratio = (len(uniq)/len(words)) if words else 0
    forensic['checks'] = {
        'wordCount': len(words),
        'uniqueRatio': uniq_ratio,
    }
    if len(words) < 20:
        forensic['checks']['aiLikelihood'] = 'unknown'
    elif uniq_ratio < 0.5:
        forensic['checks']['aiLikelihood'] = 'likely-ai'
    else:
        forensic['checks']['aiLikelihood'] = 'likely-human'

    dates = re.findall(r"\b(19|20)\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}\b", text)
    forensic['checks']['ocrDates'] = dates[:5]
    score = 40 + int(uniq_ratio*40)
    if 'dimensions' in forensic['metadata']:
        score += 10
    if forensic['checks'].get('aiLikelihood') == 'likely-ai':
        score -= 15
    score = max(0, min(100, score))
    forensic['score'] = score
except Exception as e:
    forensic['error'] = str(e)

job['status'] = 'done'
job['finishedAt'] = __import__('datetime').datetime.utcnow().isoformat()
job['result'] = res
job['result']['forensic'] = forensic
job_file.write_text(json.dumps(job, indent=2, ensure_ascii=False))
print('Updated job with results:', job_file)
print(job)
