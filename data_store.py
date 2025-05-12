import uuid
import logging
from datetime import datetime, timedelta
import json
import threading

logger = logging.getLogger(__name__)

class DataStore:
    """
    In-memory data store for the application.
    Handles persistence of templates, rules, settings, and comment history.
    """
    
    def __init__(self):
        self.templates = {}
        self.rules = {}
        self.comment_history = []
        self.settings = {
            "enabled": True,
            "max_comments_per_hour": 10,
            "notification_email": "",
            "error_notification": True
        }
        self._lock = threading.RLock()
        self._init_sample_data()
    
    def _init_sample_data(self):
        """Initialize with some sample templates and rules"""
        # Sample templates
        template1_id = str(uuid.uuid4())
        template2_id = str(uuid.uuid4())
        
        self.templates = {
            template1_id: {
                "id": template1_id,
                "name": "Thank You Template",
                "content": "Thank you for your post! This is really interesting.",
                "variables": [],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            },
            template2_id: {
                "id": template2_id,
                "name": "Question Response",
                "content": "Great question! Have you considered {suggestion}?",
                "variables": ["suggestion"],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        }
        
        # Sample rules
        rule_id = str(uuid.uuid4())
        self.rules = {
            rule_id: {
                "id": rule_id,
                "name": "New Post Response",
                "template_id": template1_id,
                "trigger_type": "new_post",
                "trigger_keywords": ["help", "question"],
                "variable_values": {},
                "enabled": True,
                "cooldown_minutes": 60,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        }
    
    def get_templates(self):
        """Get all templates"""
        with self._lock:
            return list(self.templates.values())
    
    def get_template(self, template_id):
        """Get a specific template by ID"""
        with self._lock:
            return self.templates.get(template_id)
    
    def add_template(self, template_data):
        """Add a new template"""
        with self._lock:
            template_id = str(uuid.uuid4())
            template_data["id"] = template_id
            template_data["created_at"] = datetime.now().isoformat()
            template_data["updated_at"] = datetime.now().isoformat()
            self.templates[template_id] = template_data
            return template_id
    
    def update_template(self, template_id, template_data):
        """Update an existing template"""
        with self._lock:
            if template_id not in self.templates:
                return False
            
            # Preserve the original creation date
            template_data["created_at"] = self.templates[template_id]["created_at"]
            template_data["updated_at"] = datetime.now().isoformat()
            self.templates[template_id] = template_data
            return True
    
    def delete_template(self, template_id):
        """Delete a template by ID"""
        with self._lock:
            if template_id not in self.templates:
                return False
            
            # Check if template is used by any rules
            for rule in self.rules.values():
                if rule["template_id"] == template_id:
                    return False
            
            del self.templates[template_id]
            return True
    
    def get_rules(self):
        """Get all rules"""
        with self._lock:
            return list(self.rules.values())
    
    def get_rule(self, rule_id):
        """Get a specific rule by ID"""
        with self._lock:
            return self.rules.get(rule_id)
    
    def add_rule(self, rule_data):
        """Add a new rule"""
        with self._lock:
            rule_id = str(uuid.uuid4())
            rule_data["id"] = rule_id
            rule_data["created_at"] = datetime.now().isoformat()
            rule_data["updated_at"] = datetime.now().isoformat()
            self.rules[rule_id] = rule_data
            return rule_id
    
    def update_rule(self, rule_id, rule_data):
        """Update an existing rule"""
        with self._lock:
            if rule_id not in self.rules:
                return False
            
            # Preserve the original creation date
            rule_data["created_at"] = self.rules[rule_id]["created_at"]
            rule_data["updated_at"] = datetime.now().isoformat()
            self.rules[rule_id] = rule_data
            return True
    
    def delete_rule(self, rule_id):
        """Delete a rule by ID"""
        with self._lock:
            if rule_id not in self.rules:
                return False
            
            del self.rules[rule_id]
            return True
    
    def get_settings(self):
        """Get application settings"""
        with self._lock:
            return self.settings
    
    def update_settings(self, settings_data):
        """Update application settings"""
        with self._lock:
            self.settings.update(settings_data)
            return True
    
    def add_comment_history(self, comment_data):
        """Add a new comment to history"""
        with self._lock:
            comment_data["id"] = str(uuid.uuid4())
            comment_data["timestamp"] = datetime.now().isoformat()
            self.comment_history.append(comment_data)
            
            # Trim history if it gets too large (keep last 1000 entries)
            if len(self.comment_history) > 1000:
                self.comment_history = self.comment_history[-1000:]
    
    def get_comment_history(self):
        """Get comment history"""
        with self._lock:
            return sorted(
                self.comment_history, 
                key=lambda x: x["timestamp"], 
                reverse=True
            )
    
    def get_recent_comments(self, hours=1):
        """Get comments from the last N hours"""
        with self._lock:
            cutoff = datetime.now() - timedelta(hours=hours)
            cutoff_str = cutoff.isoformat()
            
            return [
                comment for comment in self.comment_history
                if comment["timestamp"] > cutoff_str
            ]
    
    def get_analytics(self):
        """Get analytics data for the dashboard"""
        with self._lock:
            # Calculate daily stats for the last 7 days
            now = datetime.now()
            daily_counts = []
            success_count = 0
            error_count = 0
            
            for i in range(7):
                day = now - timedelta(days=i)
                day_start = datetime(day.year, day.month, day.day, 0, 0, 0).isoformat()
                day_end = datetime(day.year, day.month, day.day, 23, 59, 59).isoformat()
                
                day_comments = [
                    comment for comment in self.comment_history
                    if day_start <= comment["timestamp"] <= day_end
                ]
                
                day_success = len([c for c in day_comments if c["status"] == "success"])
                day_error = len([c for c in day_comments if c["status"] == "error"])
                
                daily_counts.append({
                    "date": day.strftime("%Y-%m-%d"),
                    "success": day_success,
                    "error": day_error
                })
                
                success_count += day_success
                error_count += day_error
            
            # Calculate template usage
            template_usage = {}
            for comment in self.comment_history:
                template_id = comment.get("template_id")
                if template_id:
                    template_usage[template_id] = template_usage.get(template_id, 0) + 1
            
            # Get template names
            template_stats = []
            for template_id, count in template_usage.items():
                template = self.templates.get(template_id, {"name": "Unknown Template"})
                template_stats.append({
                    "id": template_id,
                    "name": template["name"],
                    "count": count
                })
            
            # Sort by usage count
            template_stats.sort(key=lambda x: x["count"], reverse=True)
            
            return {
                "total_comments": len(self.comment_history),
                "success_rate": (success_count / (success_count + error_count) * 100) if success_count + error_count > 0 else 100,
                "daily_counts": daily_counts,
                "template_stats": template_stats
            }
    
    def get_dashboard_stats(self):
        """Get summary statistics for the dashboard"""
        with self._lock:
            today = datetime.now().strftime("%Y-%m-%d")
            today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
            
            today_comments = [
                comment for comment in self.comment_history
                if comment["timestamp"] >= today_start
            ]
            
            recent_comments = self.get_recent_comments(hours=24)
            success_comments = [c for c in recent_comments if c["status"] == "success"]
            
            return {
                "total_templates": len(self.templates),
                "total_rules": len(self.rules),
                "active_rules": len([r for r in self.rules.values() if r["enabled"]]),
                "comments_today": len(today_comments),
                "total_comments": len(self.comment_history),
                "success_rate": (len(success_comments) / len(recent_comments) * 100) if recent_comments else 100
            }
