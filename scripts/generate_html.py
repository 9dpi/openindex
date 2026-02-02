import yaml
import os

def generate_row(record, index):
    stars_24h = record['metrics'].get('stars_24h', 0)
    stars_7d = record['metrics'].get('stars_7d', 0)
    
    change_24h_class = "change-pos" if stars_24h >= 0 else "change-neg"
    change_7d_class = "change-pos" if stars_7d >= 0 else "change-neg"
    
    status_icon = "check-circle"
    status_color = "#10b981"
    
    if record['status']['index_status'] == 'under_review':
        status_icon = "activity"
        status_color = "#ff9d00"
    elif record['status']['index_status'] == 'flagged':
        status_icon = "alert-triangle"
        status_color = "#ef4444"

    domain_class = f"tag-{record['domain'].lower()}"
    category_class = f"tag-{record['category'].lower()[:4]}" # app, infr, anal
    
    # Map domain for tag display
    domain_display = record['domain'].capitalize()
    if record['domain'] == 'hybrid': domain_display = 'Hybrid'
    
    row_html = f"""
                    <tr>
                        <td data-label="#">{index:02d}</td>
                        <td data-label="Repository">
                            <div class="repo-info">
                                <a href="{record['repo_url']}" class="repo-name">{record['project_name']}</a>
                                <span class="repo-sub">{record['owner']} / {record['project_name'].lower()}</span>
                            </div>
                        </td>
                        <td data-label="Stars" class="mono-font">{record['metrics']['stars']:,}</td>
                        <td data-label="24H ∆" class="mono-font {change_24h_class}">{'+' if stars_24h > 0 else ''}{stars_24h:,}</td>
                        <td data-label="7D ∆" class="mono-font {change_7d_class}">{'+' if stars_7d > 0 else ''}{stars_7d:,}</td>
                        <td data-label="Forks" class="mono-font">{record['metrics']['forks']:,}</td>
                        <td data-label="Description" style="font-size: 0.85rem;">{record['summary']}</td>
                        <td data-label="Domain"><span class="tag {domain_class}">{domain_display}</span></td>
                        <td data-label="Category"><span class="tag {category_class}">{record['category'].capitalize()}</span></td>
                        <td data-label="Updated" class="mono-font text-muted">{record['timestamps']['last_verified']}</td>
                        <td data-label="Status"><i data-lucide="{status_icon}" color="{status_color}" size="16"></i></td>
                    </tr>"""
    return row_html

def main():
    domain_dirs = ['health', 'finance', 'hybrid']
    html_file = 'index.html'
    
    records = []
    for domain in domain_dirs:
        if os.path.exists(domain):
            for filename in os.listdir(domain):
                if filename.endswith('.yaml'):
                    with open(os.path.join(domain, filename), 'r', encoding='utf-8') as f:
                        records.append(yaml.safe_load(f))
    
    # Sort by stars or something? Let's sort by ID for now
    records.sort(key=lambda x: x['openindex_id'])
    
    rows_html = ""
    for i, record in enumerate(records, 1):
        rows_html += generate_row(record, i)
        
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    marker = "<!-- RECORDS_DATA -->"
    if marker in content:
        # We need to find the <tbody> tags and replace content inside
        # Actually, let's just use the marker approach
        parts = content.split(marker)
        if len(parts) == 2:
            new_content = parts[0] + marker + rows_html + parts[1]
            
            # Since we want to RE-RUN this, we need a way to wrap the dynamic part
            # Let's use start/end markers
            start_marker = "<!-- RECORDS_START -->"
            end_marker = "<!-- RECORDS_END -->"
            
            # Check if markers already exist
            if start_marker in content and end_marker in content:
                import re
                new_content = re.sub(f"{start_marker}.*?{end_marker}", f"{start_marker}{rows_html}{end_marker}", content, flags=re.DOTALL)
            else:
                # Replace the simple marker with the wrapped version
                new_content = content.replace(marker, f"{start_marker}{rows_html}{end_marker}")
                
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Successfully updated {html_file} with {len(records)} records.")
        else:
            print("Marker not found in index.html")

if __name__ == "__main__":
    main()
