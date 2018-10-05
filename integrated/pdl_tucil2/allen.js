var express = require('express');
var router = express.Router();

function getRecord(response, operator, startTime, endTime) {  
    var connInfo = require('./db_config.js');
    var marklogic = require('marklogic');
    var db = marklogic.createDatabaseClient(connInfo);
    var qb = marklogic.queryBuilder;

    db.documents.query(
        qb.where(
            qb.and(
                qb.collection('treatment'),
                qb.periodRange(
                    'valid', 
                    operator, 
                    qb.period(startTime, endTime)
                )
            )
        ).withOptions({categories: ['content', 'metadata-values']})
    ).result(function(results) {
        console.log(JSON.stringify(results, null, 2));
        response.render(
            'allen',
            { title: 'Allen\'s Interval', data: results}
        );
    });	
}

router.get('/', function (request, response) {
    response.render(
        'allen',
        { title: 'Allen\'s Interval'}
    );
});

router.get('/equals/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_EQUALS', startTime, endTime);
});

router.get('/contains/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_CONTAINS', startTime, endTime);
});

router.get('/contained_by/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_CONTAINED_BY', startTime, endTime);
});

router.get('/meets/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_MEETS', startTime, endTime);
});

router.get('/met_by/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_MET_BY', startTime, endTime);
});

router.get('/before/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_BEFORE', startTime, endTime);
});

router.get('/after/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_AFTER', startTime, endTime);
});

router.get('/starts/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_STARTS', startTime, endTime);
});

router.get('/started_by/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_STARTED_BY', startTime, endTime);
});

router.get('/finishes/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_FINISHES', startTime, endTime);
});

router.get('/finished_by/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_FINISHED_BY', startTime, endTime);
});

router.get('/overlaps/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_OVERLAPS', startTime, endTime);
});

router.get('/overlapped_by/:start/:end', function (request, response) {
    var startTime = request.params.start;
    var endTime = request.params.end;
    getRecord(response, 'ALN_OVERLAPPED_BY', startTime, endTime);
});

module.exports = router;