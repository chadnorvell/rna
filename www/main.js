async function getCommits(owner, repo, start, end) {
  let page = 1;
  let done = false;
  while (!done) {
    let url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
    const params = {'since': start, 'until': end, 'per_page': 100, page};
    for (const param in params) {
      url.searchParams.append(param, params[param]);
    }
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    const response = await fetch(url.href, {'method': 'GET', headers});
    const data = await response.json();
    if (data.length === 0) {
      done = true;
      continue;
    }
    console.log(`Page ${page} - ${data.length} items`);
  }
}

function main() {
  const owner = 'google';
  const repo = 'pigweed';
  const start = '2023-07-07T00:00:00Z';
  const end = '2023-07-07T23:59:59Z';
  getCommits(owner, repo, start, end);
}

(async () => {
  main();
})();
