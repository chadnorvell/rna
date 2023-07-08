import json
import os
import urllib

import requests
import openai


def get_config():
    with open('config.json') as f:
        config = json.load(f)
    return config


# def resolve_multiscope_commits(unresolved_commits):
#     pass


def get_raw_commits(owner, repo, start, end):
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
    return data


def prune_commits(raw_commits):
    pruned_commits = []
    for raw_commit in raw_commits:
        url = raw_commit['url']
        sha = raw_commit['sha']
        message = raw_commit['commit']['message']
        date = raw_commit['commit']['committer']['date']
        pruned_commits.append({
            'url': url,
            'sha': sha,
            'message': message,
            'date': date
        })
    return pruned_commits


def parse_scope(commit_message):
    end = commit_message.index(':')
    return commit_message[0:end]


def filter_commits(unfiltered_commits):
    ok_commits = []
    keywords = ['roll']
    for commit in unfiltered_commits:
        ok = True
        scope = parse_scope(commit['message'])
        for keyword in keywords:
            if keyword in scope:
                ok = False
        if ok:
            ok_commits.append(commit)
    return ok_commits


def generate_summaries(commits):
    for commit in commits:
        message = commit['message']
        data = [
            {
                'role': 'system',
                'content': (
                    "The content of the user's message will be a Git commit. " 
                    "Create a 1-sentence summary of the commit. "
                    "Start the summary with a present-tense verb."
                )
            },
            {
                'role': 'user',
                'content': message
            }
        ]
        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=data,
            max_tokens=100,
            temperature=0
        )
        summary = response['choices'][0]['message']['content']
        commit['summary'] = summary
    return commits


# def categorize_commits(commits):
#     for commit in commits:
#         categories = []
#         message = commit['message']
#         scope = parse_scope(message)
#         if '{' in scope:  # Multi-scope commit. Resolve to individual scopes.
#             start = scope.index('{') + 1
#             end = scope.index('}')
#             tokens = scope[start:end]
#             for token in tokens.split(','):
#                 stripped_token = token.strip()
#                 categories.append(f'pw_{stripped_token}')
#         else:  # Single-scope commit.
#             categories.append(scope)
#         commit['categories'] = categories
#     return commits


def main():
    try:
        openai.api_key = os.getenv('OPENAI_API_KEY')
        config = get_config()
        owner = config['owner']
        repo = config['repo']
        start = config['start']
        end = config['end']
        raw_commits = get_raw_commits(owner, repo, start, end)
        pruned_commits = prune_commits(raw_commits)
        filtered_commits = filter_commits(pruned_commits)
        summarized_commits = generate_summaries(filtered_commits)
        with open('www/commits.json', 'w') as f:
            json.dump(summarized_commits, f, indent=4)
    except Exception as e:
        print('an unexpected error occurred')
        print(e)


main()
