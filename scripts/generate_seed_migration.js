import fs from 'fs'

// Function to convert weight based on the rules
function convertWeight(weight) {
  const weightMap = {
    '1': 1,
    '2': 0.5,
    '3': 1,
    '4': 0.5,
    '5': 1
  }
  return weightMap[weight] || 1
}

// Function to generate SQL migration
function generateMigration(csvContent) {
  const lines = csvContent.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  // Remove header
  lines.shift()
  
  // Store unique apps, tags, and categories with their IDs
  const apps = new Map()
  const uniqueTags = new Map() // Changed to Map to store tag ID
  const uniqueCategories = new Map() // Changed to Map to store category ID
  
  // Generate IDs for tags and categories first
  lines.forEach(line => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [name, app_id, platform, is_browser, tag, weight, category] = line.split(',')
    if (!platform) return
    
    if (tag) {
      const trimmedTag = tag.trim()
      if (!uniqueTags.has(trimmedTag)) {
        uniqueTags.set(trimmedTag, crypto.randomUUID())
      }
    }
    if (category) {
      const trimmedCategory = category.trim()
      if (!uniqueCategories.has(trimmedCategory)) {
        uniqueCategories.set(trimmedCategory, crypto.randomUUID())
      }
    }
  })

  lines.forEach(line => {
    const [name, app_id, platform, is_browser, tag, weight, category] = line.split(',')
    if (!platform) return
    
    const appKey = `${name}${app_id ? `|${app_id}` : ''}|${platform}`
    if (!apps.has(appKey)) {
      apps.set(appKey, {
        id: crypto.randomUUID(),
        name: name.trim(),
        app_id: app_id ? app_id.trim() : null,
        platform: platform.trim(),
        is_browser: is_browser === '1',
        tags: new Set(),
        categories: new Set(),
        tagWeights: new Map()
      })
    }

    const app = apps.get(appKey)
    if (tag) {
      const trimmedTag = tag.trim()
      app.tags.add(trimmedTag)
      app.tagWeights.set(trimmedTag, convertWeight(weight))
    }
    if (category) {
      app.categories.add(category.trim())
    }
  })

  // Generate SQL
  let sql = '-- Migration generated automatically\n\n'
  
  // Clear existing data
  sql += '-- Clear existing data\n'
  sql += 'DELETE FROM app_tag WHERE is_default = TRUE AND created_at = updated_at;\n'
  sql += 'DELETE FROM app WHERE is_default = TRUE AND created_at = updated_at;\n'
  sql += 'DELETE FROM tag WHERE is_default = TRUE AND created_at = updated_at;\n\n'
  
  // Insert default tags
  sql += '-- Insert default tags\n'
  sql += `INSERT INTO tag (id, name, tag_type, is_default) VALUES ('${crypto.randomUUID()}', 'idle', 'default', TRUE);\n`

  sql += 'INSERT INTO tag (id, name, tag_type, is_default) VALUES\n'
  const tagValues = Array.from(uniqueTags.entries())
    .map(([tag, id]) => `('${id}', '${tag.replace(/'/g, '\'\'')}', 'default', TRUE)`)
  sql += tagValues.join(',\n') + ';\n\n'

  // Insert category tags
  sql += '-- Insert category tags\n'
  sql += 'INSERT INTO tag (id, name, tag_type, is_default) VALUES\n'
  const categoryValues = Array.from(uniqueCategories.entries())
    .map(([category, id]) => `('${id}', '${category.replace(/'/g, '\'\'')}', 'category', TRUE)`)
  sql += categoryValues.join(',\n') + ';\n\n'

  // Insert apps
  sql += '-- Insert apps\n'
  sql += 'INSERT INTO app (id, name, app_id, platform, is_browser, is_default) VALUES\n'
  const appValues = Array.from(apps.values())
    .map(app => `(${
      [
        `'${app.id}'`,
        `'${app.name.replace(/'/g, '\'\'')}'`,
        app.app_id ? `'${app.app_id.replace(/'/g, '\'\'')}'` : 'NULL',
        `'${app.platform}'`,
        app.is_browser ? '1' : '0',
        'TRUE'
      ].join(', ')
    })`)
  sql += appValues.join(',\n') + ';\n\n'

  // Insert app_tag relationships
  sql += '-- Insert app_tag relationships\n'
  sql += 'INSERT INTO app_tag (id, app_id, tag_id, weight, is_default) VALUES\n'
  
  const appTagValues = []
  apps.forEach(app => {
    app.tags.forEach(tag => {
      const weight = app.tagWeights.get(tag)
      const tagId = uniqueTags.get(tag)
      appTagValues.push(`('${crypto.randomUUID()}', '${app.id}', '${tagId}', ${weight}, TRUE)`)
    })
    app.categories.forEach(category => {
      const categoryId = uniqueCategories.get(category)
      appTagValues.push(`('${crypto.randomUUID()}', '${app.id}', '${categoryId}', 1, TRUE)`)
    })
  })
  
  sql += appTagValues.join(',\n') + ';\n'

  return sql
}

// Example usage
const csvContent = fs.readFileSync('apps.csv', 'utf-8')
const sql = generateMigration(csvContent)
fs.writeFileSync('20250202203500_seed_apps_tags.sql', sql)
