from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from seo_audit import run_seo_audit
from proposal_generator import generate_proposal
from pdf_generator import create_seo_pdf

app = Flask(__name__)
CORS(app)


@app.route('/', methods=['GET'])
def health():
    return jsonify({'status': 'SEO Suite Backend is running!'})


@app.route('/api/audit', methods=['POST'])
def audit():
    body = request.get_json()
    if not body or not body.get('url'):
        return jsonify({'error': 'Missing url in request body'}), 400
    url = body['url'].strip()
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
    try:
        result = run_seo_audit(url)
        print(">>> AUDIT RESULT SPEED DATA:", result.get('speed'))  # ADD THIS
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/audit/pdf', methods=['POST'])
def audit_pdf():
    body = request.get_json()
    print(">>> PDF keys received:", list(body.keys()) if body else 'EMPTY')
    print(">>> keywords field:", body.get('keywords'))
    if not body:
        return jsonify({'error': 'Missing request body'}), 400
    try:
        pdf_buffer = create_seo_pdf(body)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='seo_audit_report.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/proposal', methods=['POST'])
def proposal():
    body = request.get_json()

    print(">>> FULL BODY:", body)
    print(">>> HUMANIZE:", body.get('humanize'), "| TYPE:", type(body.get('humanize')))

    if not body:
        return jsonify({'error': 'Missing request body'}), 400

    required = ['requirement', 'budget', 'platform', 'tone', 'industry', 'name']
    for field in required:
        if not body.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    try:
        result = generate_proposal(
            requirement=body['requirement'],
            budget=body['budget'],
            platform=body['platform'],
            tone=body['tone'],
            industry=body['industry'],
            name=body['name'],
            humanize=body.get('humanize', True),  # ✅ default True
        )
        return jsonify({'proposal': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)