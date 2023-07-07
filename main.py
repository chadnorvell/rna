import csv
import io
import json
import os
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


def get_unsorted_commits(tmp_dir):
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
        return unsorted_commits
    except subprocess.CalledProcessError as e:
        print('git log error')


def parse_commit_scope(commit_message):
    end = commit_message.index(':')
    return commit_message[0:end]


def should_ignore_commit(commit_scope):
    should_ignore = False
    ignorelist = [
        'Revert',
        'Reland',
        'roll',
    ]
    for item in ignorelist:
        if item in commit_scope:
            should_ignore = True
    return should_ignore


def resolve_scopes(scope):
    start = scope.index('{') + 1
    end = scope.index('}')
    tokens = scope[start:end]
    scopes = []
    for token in tokens.split(','):
        stripped_token = token.strip()
        scope = f'pw_{stripped_token}'
        scopes.append(scope)
    return scopes


def categorize_commits(unsorted_commits):
    data = {}
    for commit in unsorted_commits:
        commit_hash = commit[0]
        message = commit[1]
        date = commit[2]
        scope = parse_commit_scope(message)
        if should_ignore_commit(scope):
            continue
        if '{' in scope:
            scopes = resolve_scopes(scope)
        else:
            scopes = [scope]
        for s in scopes:
            if '/' in s:
                # TODO: Avoid overwriting this var.
                s = s[0:s.index('/')]
            if s not in data:
                data[s] = []
            data[s].append({
                'hash': commit_hash,
                'message': message,
                'date': date
            })
    return data


def cleanup(tmp_dir):
    if os.path.isdir(tmp_dir):
        shutil.rmtree(tmp_dir)


def main():
    try:
        tmp_dir = 'tmp'
        repo_url = get_repo_url()
        clone_repo(repo_url, tmp_dir)
        unsorted_commits = get_unsorted_commits(tmp_dir)
        commits = categorize_commits(unsorted_commits)
        print(json.dumps(commits, indent=4))
    except Exception as e:
        print('an unexpected error occurred')
        print(e)
    finally:
        cleanup(tmp_dir)


main()
