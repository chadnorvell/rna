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
      'url': `https://cs.opensource.google/pigweed/pigweed/+/${rawCommit.sha}`,
      'sha': rawCommit.sha,
      'message': rawCommit.commit.message,
      'date': rawCommit.commit.committer.date,
      'subject': parseSubject(rawCommit.commit.message)
    });
  });
  return transformedCommits;
}

function generateRest(commits) {
  rest = '';
  let start = document.querySelector('#start').value;
  start = start.substring(0, start.indexOf('T'));
  let end = document.querySelector('#end').value;
  end = end.substring(0, end.indexOf('T'));
  rest += `.. release-notes_${start}_${end}\n\n`;
  rest += '========================================\n';
  rest += `Release notes (${start} to ${end})\n`;
  rest += '========================================\n\n';
  commits.forEach(commit => {
    rest += `* \`${commit.subject} <${commit.url}>\`\n`;
  });
  return rest;
}

window.addEventListener('load', () => {
  let start = new Date();
  let end = new Date();
  start.setDate(end.getDate() - 7);
  let startYear = start.getFullYear();
  let startMonth = (start.getMonth() + 1).toString().padStart(2, '0');
  let startDay = start.getDate().toString().padStart(2, '0');
  let endYear = end.getFullYear();
  let endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
  let endDay = end.getDate().toString().padStart(2, '0');
  document.querySelector('#start').value = `${startYear}-${startMonth}-${startDay}T00:00:00Z`;
  document.querySelector('#end').value = `${endYear}-${endMonth}-${endDay}T23:59:59Z`;
});

document.querySelector('#generate').addEventListener('click', async () => {
  const owner = document.querySelector('#owner').value;
  const repo = document.querySelector('#repo').value;
  const start = document.querySelector('#start').value;
  const end = document.querySelector('#end').value;
  const rawCommits = await getRawCommits(owner, repo, start, end);
  const commits = transformRawCommits(rawCommits);
  document.querySelector('#json').textContent = JSON.stringify(commits, null, 4);
  document.querySelector('#rest').textContent = generateRest(commits);
});
