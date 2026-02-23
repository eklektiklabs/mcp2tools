// Template engine

/**
 * Renders a template string with provided data
 * Supports:
 * - {{variable}} - variable replacement
 * - {{#if condition}}...{{/if}} - conditional rendering
 * - {{#each items}}...{{/each}} - loop rendering
 * @param {string} template - Template string with placeholders
 * @param {Object} data - Data object for template rendering
 * @returns {string} Rendered template
 */
export const render = (template, data = {}) => {
  if (typeof template !== 'string') {
    return '';
  }

  let result = template;

  // Handle {{#each items}}...{{/each}} loops
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, itemTemplate) => {
    const items = data[arrayName];
    if (!Array.isArray(items)) {
      return '';
    }
    return items.map(item => {
      // For each item, render the inner template with the item as context
      let rendered = itemTemplate;
      // Replace {{.}} for current item (scalar) or item properties
      if (typeof item === 'object' && item !== null) {
        rendered = rendered.replace(/\{\{(\w+)\}\}/g, (m, key) => {
          return item[key] !== undefined ? item[key] : '';
        });
      } else {
        rendered = rendered.replace(/\{\{\.\}\}/g, String(item));
      }
      return rendered;
    }).join('');
  });

  // Handle {{#if condition}}...{{/if}} conditionals
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, innerTemplate) => {
    const value = data[condition];
    // Truthy check: not false, not null, not undefined, not empty string, not 0
    const isTruthy = value !== false && value !== null && value !== undefined && value !== '';
    return isTruthy ? innerTemplate : '';
  });

  // Handle {{variable}} replacements
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : '';
  });

  return result;
};

import fs from 'fs';
import path from 'path';

/**
 * Loads a template file from the template directory
 * @param {string} name - Template name (without extension)
 * @param {string} templateDir - Directory containing templates
 * @returns {string} Template content
 */
export const loadTemplate = (name, templateDir) => {
  const ext = '.tmpl';
  const templatePath = path.join(templateDir, `${name}${ext}`);
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    return '';
  }
};
