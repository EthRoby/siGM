import logging
import random
import time
from datetime import datetime

logger = logging.getLogger(__name__)

class CommentService:
    """
    Service for posting comments to external platforms.
    In a real application, this would integrate with external APIs.
    For this demo, it simulates posting comments.
    """
    
    def __init__(self, data_store):
        self.data_store = data_store
    
    def post_comment(self, post_id, comment_content, rule_id=None, template_id=None):
        """
        Post a comment to the target platform.
        
        Args:
            post_id: ID of the post to comment on
            comment_content: Content of the comment
            rule_id: ID of the rule that triggered this comment
            template_id: ID of the template used for this comment
            
        Returns:
            Tuple of (success, message)
        """
        logger.debug(f"Posting comment to {post_id}: {comment_content[:50]}...")
        
        # In a real implementation, this would call an external API
        # For this demo, we'll simulate a success/failure response
        
        # Simulate API delay
        time.sleep(random.uniform(0.5, 1.5))
        
        # Simulate occasional failures (10% chance)
        if random.random() < 0.1:
            error_message = "Simulated API error: Rate limit exceeded"
            logger.error(f"Failed to post comment: {error_message}")
            
            # Record in comment history
            self.data_store.add_comment_history({
                "post_id": post_id,
                "rule_id": rule_id,
                "template_id": template_id,
                "content": comment_content,
                "status": "error",
                "error_message": error_message,
                "platform": "simulated"
            })
            
            return False, error_message
        
        # Generate a fake comment ID
        comment_id = f"comment_{int(time.time())}_{random.randint(1000, 9999)}"
        
        # Record in comment history
        self.data_store.add_comment_history({
            "post_id": post_id,
            "comment_id": comment_id,
            "rule_id": rule_id,
            "template_id": template_id,
            "content": comment_content,
            "status": "success",
            "platform": "simulated",
            "engagement": {
                "likes": 0,
                "replies": 0
            }
        })
        
        logger.info(f"Successfully posted comment. ID: {comment_id}")
        return True, f"Comment posted successfully. ID: {comment_id}"
    
    def update_comment_engagement(self, comment_id, likes=0, replies=0):
        """
        Update engagement metrics for a comment.
        In a real implementation, this would fetch data from the platform API.
        """
        history = self.data_store.get_comment_history()
        
        for comment in history:
            if comment.get("comment_id") == comment_id:
                comment["engagement"] = {
                    "likes": likes,
                    "replies": replies
                }
                comment["updated_at"] = datetime.now().isoformat()
                return True
        
        return False
    
    def delete_comment(self, comment_id):
        """
        Delete a comment from the platform.
        In a real implementation, this would call the platform's API.
        """
        # Simulate API call
        time.sleep(random.uniform(0.3, 1.0))
        
        # Update status in history
        history = self.data_store.get_comment_history()
        
        for comment in history:
            if comment.get("comment_id") == comment_id:
                comment["status"] = "deleted"
                comment["updated_at"] = datetime.now().isoformat()
                return True
        
        return False
