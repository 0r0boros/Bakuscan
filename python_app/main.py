import os
import json
import base64
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-key')

BAKUGAN_CATALOG = []
base_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else '/home/runner/workspace/python_app'
catalog_path = os.path.join(os.path.dirname(base_dir), 'shared', 'bakugan_catalog.json')
with open(catalog_path, 'r') as f:
    BAKUGAN_CATALOG = json.load(f)

BAKUGAN_NAMES = [b['name'] for b in BAKUGAN_CATALOG]

SCANS_STORAGE = {}

def analyze_bakugan(image_base64: str) -> dict:
    client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
    
    names_list = ', '.join(BAKUGAN_NAMES)
    
    prompt = f"""You are a Bakugan identification expert specializing in the original 2007-2012 toy line.

CATALOG OF KNOWN BAKUGAN:
{names_list}

Analyze this image and identify the Bakugan. Respond in JSON format only:
{{
    "name": "exact name from catalog",
    "series": "Battle Brawlers / New Vestroia / Gundalian Invaders / Mechtanium Surge",
    "attribute": "Pyrus / Aquos / Subterra / Haos / Darkus / Ventus",
    "g_power": estimated G-Power number (280-900),
    "rarity": "Common / Uncommon / Rare / Super Rare / Ultra Rare",
    "confidence": 0.0-1.0,
    "description": "brief description of identifying features"
}}

If not a Bakugan or unclear, set confidence below 0.3 and name to "Unknown"."""

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                    ]
                }
            ],
            max_tokens=1024,
            temperature=0.3
        )
        
        result_text = response.choices[0].message.content or ""
        
        json_start = result_text.find('{')
        json_end = result_text.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            result = json.loads(result_text[json_start:json_end])
            return result
        
        return {"name": "Unknown", "confidence": 0.0, "description": "Could not parse response"}
    except Exception as e:
        print(f"Analysis error: {e}")
        return {"name": "Error", "confidence": 0.0, "description": str(e)}

@app.route('/')
def index():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return render_template('index.html')

@app.route('/history')
def history():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    session_id = session['session_id']
    scans = SCANS_STORAGE.get(session_id, [])
    scans = sorted(scans, key=lambda x: x.get('created_at', ''), reverse=True)[:50]
    
    return render_template('history.html', scans=scans)

@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    data = request.json
    image_data = data.get('image')
    
    if not image_data:
        return jsonify({'error': 'No image provided'}), 400
    
    if image_data.startswith('data:'):
        image_base64 = image_data.split(',')[1]
    else:
        image_base64 = image_data
    
    result = analyze_bakugan(image_base64)
    
    scan_id = str(uuid.uuid4())
    session_id = session['session_id']
    
    scan_record = {
        'id': scan_id,
        'session_id': session_id,
        'name': result.get('name'),
        'series': result.get('series'),
        'attribute': result.get('attribute'),
        'g_power': result.get('g_power'),
        'rarity': result.get('rarity'),
        'confidence': result.get('confidence'),
        'description': result.get('description'),
        'created_at': datetime.now()
    }
    
    if session_id not in SCANS_STORAGE:
        SCANS_STORAGE[session_id] = []
    SCANS_STORAGE[session_id].append(scan_record)
    
    result['id'] = scan_id
    return jsonify(result)

@app.route('/api/history')
def api_history():
    if 'session_id' not in session:
        return jsonify([])
    
    session_id = session['session_id']
    scans = SCANS_STORAGE.get(session_id, [])
    scans = sorted(scans, key=lambda x: x.get('created_at', ''), reverse=True)[:50]
    
    return jsonify([{
        'id': s['id'],
        'name': s['name'],
        'series': s['series'],
        'attribute': s['attribute'],
        'g_power': s['g_power'],
        'rarity': s['rarity'],
        'confidence': s['confidence'],
        'description': s['description'],
        'created_at': s['created_at'].isoformat() if s.get('created_at') else None
    } for s in scans])

if __name__ == '__main__':
    print("BakuScan Python server starting...")
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
