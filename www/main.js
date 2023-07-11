async function getRawCommits(owner, repo, start, end) {
  let page = 1;
  let done = false;
  let commits = [];
  while (!done) {
    let url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
    const params = {'since': start, 'until': end, 'per_page': 100, page};
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    const response = await fetch(url.href, {'method': 'GET', headers});
    if (!response.ok) {
      // TODO: Alert the user.
      console.error(response);
      return;
    }
    const data = await response.json();
    if (data.length === 0) {
      done = true;
      continue;
    }
    commits = commits.concat(data);
    page += 1;
  }
  return commits;
}

function transformRawCommits(rawCommits) {
  function parseSubject(message) {
    const end = message.indexOf('\n\n');
    return message.substring(0, end);
  }
  let transformedCommits = [];
  rawCommits.forEach(rawCommit => {
    transformedCommits.push({
      'url': rawCommit.url,
      'sha': rawCommit.sha,
      'message': rawCommit.commit.message,
      'date': rawCommit.commit.committer.date,
      'subject': parseSubject(rawCommit.commit.message)
    });
  });
  return transformedCommits;
}

(async () => {
  const owner = 'google';
  const repo = 'pigweed';
  const start = '2023-07-07T00:00:00Z';
  const end = '2023-07-07T23:59:59Z';
  const rawCommits = await getRawCommits(owner, repo, start, end);
  const commits = transformRawCommits(rawCommits);
  console.log(commits);
})();
