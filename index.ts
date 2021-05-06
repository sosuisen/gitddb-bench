import { GitDocumentDB, RemoteOptions, RemoteRepository } from 'git-documentdb';

const sleep = (msec: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, msec);
  })
};

const bench = async () => {
  const gitDDB = new GitDocumentDB({ db_name: 'bench', log_level: 'trace' });
  const remoteURLBase = process.env.GITDDB_GITHUB_USER_URL?.endsWith('/')
  ? process.env.GITDDB_GITHUB_USER_URL
  : process.env.GITDDB_GITHUB_USER_URL + '/';
  const token = process.env.GITDDB_PERSONAL_ACCESS_TOKEN!;
  const remoteOptions: RemoteOptions = {
    remote_url: remoteURLBase + 'bench',
    interval: 3000,
    live: false,
    connection: {
      type: 'github',
      personal_access_token: token,
    }
  };

  const res = await gitDDB.open();
  if(!res.ok) {
    await gitDDB.create();
  }

  console.log('Preparing remote repository..');
  const remoteRepos = new RemoteRepository(remoteOptions);
  await remoteRepos.destroy().catch(e => { console.log(e)});
  const sync = await gitDDB.sync(remoteOptions);

  let fetchCounter = 0;
  let pushCounter = 0;
  let syncCounter = 0;
  let startTime = 0;
  let benchTime = 0;

  console.log('Start benchmark..');  

  console.log('Fetch..');

  startTime = (new Date()).valueOf();
  benchTime = 0;

  while (true) {
    benchTime = (new Date()).valueOf() - startTime;
    if (benchTime > 30 * 1000) break;
    await sync.trySync();
  }

  fetchCounter = gitDDB.taskQueue.statistics().sync;
  console.log(`Fetch (${benchTime/1000}sec): ${fetchCounter}`);

  await sleep(3000);

  console.log('Put and push..');

  startTime = (new Date()).valueOf();
  benchTime = 0;

  while (true) {
    benchTime = (new Date()).valueOf() - startTime;
    if (benchTime > 30 * 1000) break;
    await gitDDB.put({ _id: '1' });
    await sync.tryPush();
  }
  pushCounter = gitDDB.taskQueue.statistics().push;
  console.log(`Put and push (${benchTime/1000}sec): ${pushCounter}`);

  await sleep(3000);

  console.log('Put and fetch and push..');

  startTime = (new Date()).valueOf();
  benchTime = 0;
  while (true) {
    benchTime = (new Date()).valueOf() - startTime;
    if (benchTime > 30 * 1000) break;
    await gitDDB.put({ _id: '1' });
    await sync.trySync();
  }
  syncCounter = gitDDB.taskQueue.statistics().sync - fetchCounter;
  console.log(`Put and fetch and push (${benchTime/1000}sec): ${syncCounter}`);

  gitDDB.destroy();
};

if (process.env.GITDDB_GITHUB_USER_URL && process.env.GITDDB_PERSONAL_ACCESS_TOKEN) {
  bench();
}
else {
  console.log('Please set following env: GITDDB_GITHUB_USER_URL, process.env.GITDDB_PERSONAL_ACCESS_TOKEN');
}
