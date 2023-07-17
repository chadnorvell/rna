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

function aggregateCommits(commits, separator) {
  return commits.reduce((aggregated, commit) => {
    const [category, ...subjectElements] = commit.subject.split(separator);
    const subject = subjectElements.length > 0 ? subjectElements.join(separator).trim() : "other";
    const revisedCommit = {...commit, subject};
    aggregated[category] = aggregated.hasOwnProperty(category) ? [...aggregated[category], revisedCommit] : [revisedCommit];
    return aggregated;
  }, {});
}

function generateRestForSection(commits, level) {
  rest = '';
  bulletSpacing = '  '.repeat(level - 1);
  commits.forEach(commit => {
    rest += `${bulletSpacing}* \`${commit.subject} <${commit.url}>\`\n`;
  });
  return rest;
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

  if (Array.isArray(commits)) {
    rest += generateRestForSection(commits, 1);
  } else {
    for (const category in commits) {
      rest += `* ${category}\n`
      rest += generateRestForSection(commits[category], 2);
    }
  }

  return rest;
}

function generateHtmlForSection(commits) {
  html = '';
  commits.forEach(commit => {
    html += `<li><a href="${commit.url}">${commit.subject}</a></li>\n`;
  });
  return html;
}

function generateHtml(commits) {
  html = '';
  let start = document.querySelector('#start').value;
  start = start.substring(0, start.indexOf('T'));
  let end = document.querySelector('#end').value;
  end = end.substring(0, end.indexOf('T'));
  html += `<h3>Release notes (${start} to ${end})</h3>\n`;
  html += `<ul>`

  if (Array.isArray(commits)) {
    html += generateHtmlForSection(commits);
  } else {
    for (const category in commits) {
      html += `<li><strong>${category}</strong></li>\n`
      html += `<ul>`
      html += generateHtmlForSection(commits[category]);
      html += `</ul>`
    }
  }

  html += `</ul>`
  return html;
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
  const shouldAggregate = document.querySelector('#shouldAggregate').checked;
  const aggregationSeparator = document.querySelector('#aggregationSeparator').value;
  const rawCommits = await getRawCommits(owner, repo, start, end);
  const transformedCommits = transformRawCommits(rawCommits);
  const commits = shouldAggregate ? aggregateCommits(transformedCommits, aggregationSeparator) : transformedCommits;
  document.querySelector('#json').textContent = JSON.stringify(commits, null, 4);
  document.querySelector('#rest').textContent = generateRest(commits);
  document.querySelector('#html').innerHTML = generateHtml(commits);
});
