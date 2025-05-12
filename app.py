import os
import logging
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Import local modules
from data_store import DataStore
from bot import Bot
from comment_service import CommentService

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# Initialize data store
data_store = DataStore()

# Initialize comment service
comment_service = CommentService(data_store)

# Initialize bot
bot = Bot(data_store, comment_service)

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(bot.run_scheduled_tasks, 'interval', minutes=5)
scheduler.start()

# Routes
@app.route('/')
def index():
    return render_template('index.html', 
                          stats=data_store.get_dashboard_stats())

@app.route('/templates')
def templates():
    return render_template('templates.html', 
                          templates=data_store.get_templates())

@app.route('/api/templates', methods=['GET'])
def get_templates():
    return jsonify(data_store.get_templates())

@app.route('/api/templates', methods=['POST'])
def add_template():
    template_data = request.json
    template_id = data_store.add_template(template_data)
    return jsonify({"success": True, "id": template_id})

@app.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    template_data = request.json
    success = data_store.update_template(template_id, template_data)
    return jsonify({"success": success})

@app.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    success = data_store.delete_template(template_id)
    return jsonify({"success": success})

@app.route('/rules')
def rules():
    return render_template('rules.html', 
                          rules=data_store.get_rules(),
                          templates=data_store.get_templates())

@app.route('/api/rules', methods=['GET'])
def get_rules():
    return jsonify(data_store.get_rules())

@app.route('/api/rules', methods=['POST'])
def add_rule():
    rule_data = request.json
    rule_id = data_store.add_rule(rule_data)
    return jsonify({"success": True, "id": rule_id})

@app.route('/api/rules/<rule_id>', methods=['PUT'])
def update_rule(rule_id):
    rule_data = request.json
    success = data_store.update_rule(rule_id, rule_data)
    return jsonify({"success": success})

@app.route('/api/rules/<rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    success = data_store.delete_rule(rule_id)
    return jsonify({"success": success})

@app.route('/analytics')
def analytics():
    return render_template('analytics.html', 
                          history=data_store.get_comment_history(),
                          stats=data_store.get_analytics())

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    return jsonify(data_store.get_analytics())

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify(data_store.get_comment_history())

@app.route('/settings')
def settings():
    return render_template('settings.html', 
                          settings=data_store.get_settings())

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    settings_data = request.json
    success = data_store.update_settings(settings_data)
    return jsonify({"success": success})

@app.route('/api/run-now', methods=['POST'])
def run_now():
    try:
        bot.run_scheduled_tasks()
        return jsonify({"success": True, "message": "Bot tasks executed successfully"})
    except Exception as e:
        logger.error(f"Error running bot: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

# Register cleanup function
@app.teardown_appcontext
def shutdown_scheduler(exception=None):
    if scheduler.running:
        scheduler.shutdown()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
