import logging
import threading
from datetime import datetime, timedelta
import re
import time
import random

logger = logging.getLogger(__name__)

class Bot:
    """
    Bot that handles scheduled comment posting based on rules.
    """
    
    def __init__(self, data_store, comment_service):
        self.data_store = data_store
        self.comment_service = comment_service
        self.lock = threading.RLock()
    
    def run_scheduled_tasks(self):
        """Run scheduled comment posting tasks"""
        logger.debug("Running scheduled comment tasks")
        
        with self.lock:
            # Check if bot is enabled in settings
            settings = self.data_store.get_settings()
            if not settings.get("enabled", True):
                logger.info("Bot is disabled in settings, skipping scheduled tasks")
                return
            
            # Check rate limiting
            max_comments_per_hour = settings.get("max_comments_per_hour", 10)
            recent_comments = self.data_store.get_recent_comments(hours=1)
            if len(recent_comments) >= max_comments_per_hour:
                logger.info(f"Rate limit reached: {len(recent_comments)}/{max_comments_per_hour} comments in the last hour")
                return
            
            # Process active rules
            rules = self.data_store.get_rules()
            active_rules = [rule for rule in rules if rule.get("enabled", True)]
            
            logger.debug(f"Processing {len(active_rules)} active rules")
            
            for rule in active_rules:
                try:
                    self._process_rule(rule)
                except Exception as e:
                    logger.error(f"Error processing rule {rule.get('id')}: {str(e)}")
                    
                    # Record error in comment history
                    self.data_store.add_comment_history({
                        "rule_id": rule.get("id"),
                        "template_id": rule.get("template_id"),
                        "status": "error",
                        "error_message": str(e),
                        "timestamp": datetime.now().isoformat()
                    })
    
    def _process_rule(self, rule):
        """Process a single rule"""
        rule_id = rule.get("id")
        template_id = rule.get("template_id")
        
        logger.debug(f"Processing rule: {rule.get('name')} (ID: {rule_id})")
        
        # Check cooldown
        self._check_rule_cooldown(rule)
        
        # Get the template
        template = self.data_store.get_template(template_id)
        if not template:
            logger.error(f"Template not found for rule {rule_id}: {template_id}")
            return
        
        # Process the rule based on trigger type
        trigger_type = rule.get("trigger_type", "manual")
        
        if trigger_type == "new_post":
            self._process_new_post_trigger(rule, template)
        elif trigger_type == "keyword":
            self._process_keyword_trigger(rule, template)
        elif trigger_type == "scheduled":
            self._process_scheduled_trigger(rule, template)
        else:
            logger.warning(f"Unknown trigger type for rule {rule_id}: {trigger_type}")
    
    def _check_rule_cooldown(self, rule):
        """Check if a rule is on cooldown"""
        rule_id = rule.get("id")
        cooldown_minutes = rule.get("cooldown_minutes", 60)
        
        # Get recent comment history for this rule
        comment_history = self.data_store.get_comment_history()
        rule_comments = [c for c in comment_history if c.get("rule_id") == rule_id]
        
        if rule_comments:
            last_comment = max(rule_comments, key=lambda x: x["timestamp"])
            last_time = datetime.fromisoformat(last_comment["timestamp"])
            elapsed = datetime.now() - last_time
            
            if elapsed.total_seconds() < cooldown_minutes * 60:
                cooldown_remaining = cooldown_minutes - (elapsed.total_seconds() / 60)
                logger.debug(f"Rule {rule_id} is on cooldown. {cooldown_remaining:.1f} minutes remaining")
                return False
        
        return True
    
    def _process_new_post_trigger(self, rule, template):
        """Process a new post trigger"""
        # In a real implementation, this would check external APIs for new posts
        # For this example, we'll simulate finding a new post with random chance
        
        if random.random() < 0.3:  # 30% chance to find a new post
            post_id = f"post_{int(time.time())}"
            post_content = "This is a simulated new post that matches trigger criteria"
            
            logger.info(f"Found new post matching rule {rule.get('id')}: {post_id}")
            
            # Check for keywords if specified
            keywords = rule.get("trigger_keywords", [])
            if keywords and not any(keyword.lower() in post_content.lower() for keyword in keywords):
                logger.debug(f"Post {post_id} does not contain any required keywords: {keywords}")
                return
            
            # Prepare comment content
            comment_content = self._prepare_comment_content(template, rule.get("variable_values", {}))
            
            # Post the comment
            success, message = self.comment_service.post_comment(
                post_id=post_id,
                comment_content=comment_content,
                rule_id=rule.get("id"),
                template_id=template.get("id")
            )
            
            if success:
                logger.info(f"Successfully posted comment to {post_id}")
            else:
                logger.error(f"Failed to post comment: {message}")
    
    def _process_keyword_trigger(self, rule, template):
        """Process a keyword trigger"""
        # In a real implementation, this would search for content with specific keywords
        # For this example, we'll simulate finding a match with random chance
        
        if random.random() < 0.2:  # 20% chance to find a keyword match
            post_id = f"post_{int(time.time())}"
            keywords = rule.get("trigger_keywords", [])
            matched_keyword = random.choice(keywords) if keywords else "default"
            
            logger.info(f"Found keyword match for rule {rule.get('id')}: {matched_keyword}")
            
            # Prepare comment content
            variable_values = dict(rule.get("variable_values", {}))
            variable_values["keyword"] = matched_keyword  # Add the matched keyword as a variable
            
            comment_content = self._prepare_comment_content(template, variable_values)
            
            # Post the comment
            success, message = self.comment_service.post_comment(
                post_id=post_id,
                comment_content=comment_content,
                rule_id=rule.get("id"),
                template_id=template.get("id")
            )
            
            if success:
                logger.info(f"Successfully posted comment to {post_id} based on keyword: {matched_keyword}")
            else:
                logger.error(f"Failed to post comment: {message}")
    
    def _process_scheduled_trigger(self, rule, template):
        """Process a scheduled trigger"""
        # This would be triggered on a schedule rather than by external events
        post_id = f"scheduled_{int(time.time())}"
        
        logger.info(f"Processing scheduled comment for rule {rule.get('id')}")
        
        # Prepare comment content
        comment_content = self._prepare_comment_content(template, rule.get("variable_values", {}))
        
        # Post the comment
        success, message = self.comment_service.post_comment(
            post_id=post_id,
            comment_content=comment_content,
            rule_id=rule.get("id"),
            template_id=template.get("id")
        )
        
        if success:
            logger.info(f"Successfully posted scheduled comment to {post_id}")
        else:
            logger.error(f"Failed to post scheduled comment: {message}")
    
    def _prepare_comment_content(self, template, variable_values):
        """Prepare comment content by filling in template variables"""
        content = template.get("content", "")
        
        # Replace variables using regex to handle complex variable names
        for var_name, var_value in variable_values.items():
            pattern = r'\{' + re.escape(var_name) + r'\}'
            content = re.sub(pattern, str(var_value), content)
        
        # Check for any remaining unfilled variables
        remaining_vars = re.findall(r'\{([^}]+)\}', content)
        if remaining_vars:
            logger.warning(f"Template has unfilled variables: {remaining_vars}")
            
            # Replace remaining variables with placeholders
            for var_name in remaining_vars:
                pattern = r'\{' + re.escape(var_name) + r'\}'
                content = re.sub(pattern, f"[{var_name}]", content)
        
        return content
