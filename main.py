import csv
import io
import json
import os
import pprint
import shutil
import subprocess

def get_config():
    with open('config.json') as f:
        config = json.load(f)
    return config

def get_start() -> str:
    return get_config()['start']

def get_end() -> str:
    return get_config()['end']

def get_repo_url() -> str:
    return get_config()['repo']

def clone_repo(repo_url: str, tmp_dir: str) -> None:
    subprocess.run(
        ['git', 'clone', repo_url, tmp_dir],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

def log(tmp_dir):
    try:
        start = f'--after="{get_start()}'
        end = f'--before="{get_end()}'
        log_format = '--pretty=format:%h,"%s",%ad'
        date_format = '--date=short'
        result = subprocess.run(
            ['git', 'log', start, end, log_format, date_format],
            cwd=tmp_dir,
            capture_output=True,
            text=True,
            check=True,
        )
        csv_data = result.stdout
        f = io.StringIO(csv_data)
        csv_reader = csv.reader(f, delimiter=',')
        unsorted_commits = []
        for commit in csv_reader:
            unsorted_commits.append(commit)
        sorted_commits = sorted(unsorted_commits, key=lambda x: x[1])
        pprint.pprint(sorted_commits)
    except subprocess.CalledProcessError as e:
        print('git log error')

def cleanup(tmp_dir):
    if os.path.isdir(tmp_dir):
        shutil.rmtree(tmp_dir)

def main():
    try:
        tmp_dir = 'tmp'
        repo_url = get_repo_url()
        clone_repo(repo_url, tmp_dir)
        log(tmp_dir)
    except Exception as e:
        print('an unexpected error occurred')
    finally:
        cleanup(tmp_dir)

main()
