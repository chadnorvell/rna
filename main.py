import json
import urllib

import requests


def get_config():
    with open('config.json') as f:
        config = json.load(f)
    return config


def get_commits(owner, repo):
    # Build the URL.
    scheme = 'https'
    netloc = 'api.github.com'
    path = f'/repos/{owner}/{repo}/commits'
    params = ''
    query = ''
    fragment = ''
    components = (scheme, netloc, path, params, query, fragment)
    url = urllib.parse.urlunparse(components)
    # Get the data.
    headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }
    response = requests.get(url, headers)
    data = response.json()
    print(data)


def main():
    try:
        config = get_config()
        owner = config['owner']
        repo = config['repo']
        start = config['start']
        end = config['end']
        get_commits(owner, repo)
        # commits = categorize_commits(unsorted_commits)
        # print(json.dumps(commits, indent=4))
    except Exception as e:
        print('an unexpected error occurred')
        print(e)


main()
