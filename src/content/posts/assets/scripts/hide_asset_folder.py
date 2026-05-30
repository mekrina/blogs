from glob import glob
import json
from pathlib import Path

articles = glob("**/*.md", recursive=True)
Path(".vscode").mkdir(exist_ok=True)
Path(".vscode/settings.json").touch(exist_ok=True)
with open(".vscode/settings.json", "r") as fp:
    try:
        setting = json.load(fp)
    except:
        setting = {}
    for article in articles:
        article_asset_folder = article.removesuffix(".md").replace("\\", "/")
        if(not ("files.exclude" in setting)):
            setting["files.exclude"] = {}        
        setting['files.exclude'][article_asset_folder] = True
with open(".vscode/settings.json", "w") as fp:
    json.dump(setting, fp, ensure_ascii=False)
    
    