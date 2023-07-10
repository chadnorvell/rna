function getCommits(owner, repo, start, end) {
  let page = 1;
  let done = false;
  while (!done) {
    let url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
    const params = {
      'since': start,
      'until': end,
      'per_page': 100,
      'page': page
    };
    for (let key in params) {
      url.searchParams.append(key, params[key]);
    }
    done = true;
    console.log(url.href);
  }
}

function main() {
  const owner = 'google';
  const repo = 'pigweed';
  const start = '2023-07-07T00:00:00Z';
  const end = '2023-07-07T23:59:59Z';
  getCommits(owner, repo, start, end);
}

main();
