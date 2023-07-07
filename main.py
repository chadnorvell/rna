import json
import urllib

import requests


def get_config():
    with open('config.json') as f:
        config = json.load(f)
    return config


def parse_scope(commit_message):
    end = commit_message.index(':')
    return commit_message[0:end]


def get_commits(owner, repo, start, end):
    page = 1
    data = []
    done = False
    path = f'/repos/{owner}/{repo}/commits'
    # Loop until we've got all the pages of data.
    while not done:
        # Build the GitHub API URL. The only thing that changes between iterations
        # is the page number.
        params = urllib.parse.urlencode({
            'since': start,
            'until': end,
            'per_page': 100,
            'page': page
        })
        url = urllib.parse.urlunparse(('https', 'api.github.com', path, '', params, ''))
        # Get this page of data.
        headers = {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
        response = requests.get(url, headers)
        json = response.json()
        if len(json) == 0:
            done = True
            continue
        data += json
        page += 1
    # Weed out all the data we don't need.
    commits = []
    for commit in data:
        url = commit['url']
        sha = commit['sha']
        message = commit['commit']['message']
        date = commit['commit']['committer']['date']
        commits.append({
            'url': url,
            'sha': sha,
            'message': message,
            'date': date
        })
    return commits


def filter_commits(unfiltered_commits):
    ok_commits = []
    keywords = [
        'Revert',
        'Reland',
        'roll'
    ]
    for commit in unfiltered_commits:
        ok = True
        scope = parse_scope(commit['message'])
        for keyword in keywords:
            if keyword in scope:
                ok = False
        if ok:
            ok_commits.append(commit)
    return ok_commits


def main():
    try:
        config = get_config()
        owner = config['owner']
        repo = config['repo']
        start = config['start']
        end = config['end']
        raw_commits = get_commits(owner, repo, start, end)
        filtered_commits = filter_commits(raw_commits)
    except Exception as e:
        print('an unexpected error occurred')
        print(e)


main()
