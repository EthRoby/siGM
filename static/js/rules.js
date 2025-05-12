let rules = [];
let templates = [];
let ruleModal;
let deleteModal;

document.addEventListener('DOMContentLoaded', function() {
    ruleModal = new bootstrap.Modal(document.getElementById('ruleModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    
    // Initialize event listeners
    document.getElementById('new-rule-btn').addEventListener('click', showNewRuleModal);
    document.getElementById('save-rule-btn').addEventListener('click', saveRule);
    document.getElementById('confirm-delete-btn').addEventListener('click', deleteRule);
    document.getElementById('trigger-type').addEventListener('change', updateFormFields);
    document.getElementById('template-id').addEventListener('change', updateTemplateVariables);
    
    // Load data
    loadTemplates();
    loadRules();
});

// Load templates from API
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        if (!response.ok) {
            throw new Error('Failed to fetch templates');
        }
        
        templates = await response.json();
        populateTemplatesDropdown();
    } catch (error) {
        console.error('Error loading templates:', error);
        showErrorMessage('Failed to load templates: ' + error.message);
    }
}

// Load rules from API
async function loadRules() {
    try {
        const response = await fetch('/api/rules');
        if (!response.ok) {
            throw new Error('Failed to fetch rules');
        }
        
        rules = await response.json();
        renderRulesTable();
    } catch (error) {
        console.error('Error loading rules:', error);
        showErrorMessage('Failed to load rules: ' + error.message);
    }
}

// Populate templates dropdown
function populateTemplatesDropdown() {
    const select = document.getElementById('template-id');
    
    // Clear existing options except the placeholder
    select.innerHTML = '<option value="">Select a template</option>';
    
    // Add template options
    templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        select.appendChild(option);
    });
}

// Render rules table
function renderRulesTable() {
    const tableBody = document.querySelector('#rulesTable tbody');
    
    if (rules.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    No rules found. Click the "New Rule" button to create one.
                </td>
            </tr>
        `;
        return;
    }
    
    const templateMap = templates.reduce((map, template) => {
        map[template.id] = template.name;
        return map;
    }, {});
    
    tableBody.innerHTML = rules.map(rule => {
        const statusBadge = rule.enabled 
            ? '<span class="badge bg-success">Active</span>'
            : '<span class="badge bg-secondary">Disabled</span>';
        
        const templateName = templateMap[rule.template_id] || 'Unknown Template';
        
        return `
            <tr>
                <td>${rule.name}</td>
                <td>
                    <span class="badge ${getTriggerTypeBadgeClass(rule.trigger_type)}">
                        ${formatTriggerType(rule.trigger_type)}
                    </span>
                </td>
                <td>${templateName}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-rule-btn" data-id="${rule.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-rule-btn" data-id="${rule.id}" data-name="${rule.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-rule-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ruleId = btn.dataset.id;
            editRule(ruleId);
        });
    });
    
    document.querySelectorAll('.delete-rule-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ruleId = btn.dataset.id;
            const ruleName = btn.dataset.name;
            showDeleteConfirmation(ruleId, ruleName);
        });
    });
}

// Show modal for creating a new rule
function showNewRuleModal() {
    // Check if templates exist
    if (templates.length === 0) {
        showErrorMessage('You need to create at least one template before creating a rule.');
        return;
    }
    
    // Reset form
    document.getElementById('rule-id').value = '';
    document.getElementById('rule-name').value = '';
    document.getElementById('template-id').value = '';
    document.getElementById('trigger-type').value = '';
    document.getElementById('trigger-keywords').value = '';
    document.getElementById('cooldown-minutes').value = '60';
    document.getElementById('rule-enabled').checked = true;
    document.getElementById('ruleModalLabel').textContent = 'New Rule';
    
    // Reset conditional fields
    document.getElementById('keywords-container').classList.add('d-none');
    document.getElementById('template-variables-container').classList.add('d-none');
    document.getElementById('variable-fields').innerHTML = '';
    
    ruleModal.show();
}

// Show modal for editing an existing rule
function editRule(ruleId) {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) {
        showErrorMessage('Rule not found');
        return;
    }
    
    document.getElementById('rule-id').value = rule.id;
    document.getElementById('rule-name').value = rule.name;
    document.getElementById('template-id').value = rule.template_id;
    document.getElementById('trigger-type').value = rule.trigger_type;
    document.getElementById('cooldown-minutes').value = rule.cooldown_minutes || 60;
    document.getElementById('rule-enabled').checked = rule.enabled;
    document.getElementById('ruleModalLabel').textContent = 'Edit Rule';
    
    // Handle trigger type specific fields
    if (rule.trigger_type === 'keyword' || rule.trigger_type === 'new_post') {
        document.getElementById('keywords-container').classList.remove('d-none');
        document.getElementById('trigger-keywords').value = (rule.trigger_keywords || []).join(', ');
    } else {
        document.getElementById('keywords-container').classList.add('d-none');
    }
    
    // Load template variables
    updateTemplateVariables();
    
    // Populate variable values if they exist
    setTimeout(() => {
        const variableValues = rule.variable_values || {};
        for (const [key, value] of Object.entries(variableValues)) {
            const input = document.getElementById(`variable-${key}`);
            if (input) {
                input.value = value;
            }
        }
    }, 100);
    
    ruleModal.show();
}

// Update form fields based on trigger type
function updateFormFields() {
    const triggerType = document.getElementById('trigger-type').value;
    
    if (triggerType === 'keyword' || triggerType === 'new_post') {
        document.getElementById('keywords-container').classList.remove('d-none');
    } else {
        document.getElementById('keywords-container').classList.add('d-none');
    }
}

// Update template variables form fields
function updateTemplateVariables() {
    const templateId = document.getElementById('template-id').value;
    const variablesContainer = document.getElementById('variable-fields');
    
    if (!templateId) {
        document.getElementById('template-variables-container').classList.add('d-none');
        return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (!template || !template.variables || template.variables.length === 0) {
        document.getElementById('template-variables-container').classList.add('d-none');
        return;
    }
    
    document.getElementById('template-variables-container').classList.remove('d-none');
    
    variablesContainer.innerHTML = template.variables.map(variable => `
        <div class="mb-2">
            <label for="variable-${variable}" class="form-label">${variable}</label>
            <input type="text" class="form-control" id="variable-${variable}" 
                   placeholder="Value for {${variable}}" data-variable="${variable}">
        </div>
    `).join('');
}

// Show delete confirmation modal
function showDeleteConfirmation(ruleId, ruleName) {
    document.getElementById('delete-rule-name').textContent = ruleName;
    document.getElementById('confirm-delete-btn').dataset.id = ruleId;
    
    deleteModal.show();
}

// Save rule (create or update)
async function saveRule() {
    const ruleId = document.getElementById('rule-id').value;
    const name = document.getElementById('rule-name').value;
    const templateId = document.getElementById('template-id').value;
    const triggerType = document.getElementById('trigger-type').value;
    const cooldownMinutes = parseInt(document.getElementById('cooldown-minutes').value, 10);
    const enabled = document.getElementById('rule-enabled').checked;
    
    if (!name || !templateId || !triggerType) {
        showErrorMessage('Please fill in all required fields');
        return;
    }
    
    // Collect trigger keywords if applicable
    let triggerKeywords = [];
    if (triggerType === 'keyword' || triggerType === 'new_post') {
        const keywordsText = document.getElementById('trigger-keywords').value;
        if (keywordsText.trim()) {
            triggerKeywords = keywordsText.split(',').map(k => k.trim()).filter(k => k);
        }
    }
    
    // Collect variable values if any
    const variableValues = {};
    document.querySelectorAll('[id^="variable-"]').forEach(input => {
        const variable = input.dataset.variable;
        if (variable && input.value.trim()) {
            variableValues[variable] = input.value.trim();
        }
    });
    
    const ruleData = {
        id: ruleId || undefined,
        name,
        template_id: templateId,
        trigger_type: triggerType,
        trigger_keywords: triggerKeywords,
        variable_values: variableValues,
        cooldown_minutes: cooldownMinutes,
        enabled
    };
    
    try {
        let response;
        
        if (ruleId) {
            // Update existing rule
            response = await fetch(`/api/rules/${ruleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ruleData)
            });
        } else {
            // Create new rule
            response = await fetch('/api/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ruleData)
            });
        }
        
        if (!response.ok) {
            throw new Error('Failed to save rule');
        }
        
        const result = await response.json();
        
        if (result.success) {
            ruleModal.hide();
            showSuccessMessage(ruleId ? 'Rule updated successfully' : 'Rule created successfully');
            loadRules();
        } else {
            showErrorMessage('Failed to save rule');
        }
    } catch (error) {
        console.error('Error saving rule:', error);
        showErrorMessage('Failed to save rule: ' + error.message);
    }
}

// Delete rule
async function deleteRule() {
    const ruleId = document.getElementById('confirm-delete-btn').dataset.id;
    
    try {
        const response = await fetch(`/api/rules/${ruleId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete rule');
        }
        
        const result = await response.json();
        
        if (result.success) {
            deleteModal.hide();
            showSuccessMessage('Rule deleted successfully');
            loadRules();
        } else {
            deleteModal.hide();
            showErrorMessage('Failed to delete rule');
        }
    } catch (error) {
        console.error('Error deleting rule:', error);
        deleteModal.hide();
        showErrorMessage('Failed to delete rule: ' + error.message);
    }
}

// Helper function for trigger type badge class
function getTriggerTypeBadgeClass(triggerType) {
    switch (triggerType) {
        case 'new_post':
            return 'bg-primary';
        case 'keyword':
            return 'bg-info';
        case 'scheduled':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

// Helper function to format trigger type
function formatTriggerType(triggerType) {
    switch (triggerType) {
        case 'new_post':
            return 'New Post';
        case 'keyword':
            return 'Keyword';
        case 'scheduled':
            return 'Scheduled';
        default:
            return triggerType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Show success message
function showSuccessMessage(message) {
    showAlert('success', message);
}

// Show error message
function showErrorMessage(message) {
    showAlert('danger', message);
}
