const autocannon = require('autocannon');

const runBenchmark = async () => {
    const url = 'http://localhost:3000/posts';
    console.log(`Starting benchmark for ${url}...`);

    const instance = autocannon({
        url,
        connections: 10, // Number of concurrent connections
        pipelining: 1,   // Number of pipelined requests
        duration: 10,    // Duration of the test in seconds
    });

    autocannon.track(instance, { renderProgressBar: true });

    instance.on('done', (result) => {
        console.log('\nBenchmark Finished!');
        console.log('-------------------');
        console.log(`Requests/sec: ${result.requests.average}`);
        console.log(`Latency (average): ${result.latency.average} ms`);
        console.log(`Throughput (average): ${result.throughput.average} bytes/sec`);
        console.log('-------------------');
    });
};

runBenchmark();
