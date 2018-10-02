var express = require('express');
var router = express.Router();

function insertRecord(record) {
    var connInfo = require('./db_config.js');
    var marklogic = require('marklogic');
    var db = marklogic.createDatabaseClient(connInfo);
    db.documents.write(record).result( 
        function(response) {
            console.log('Loaded the following documents:');
            response.documents.forEach(function(document) {
                console.log(document);
            });
        }, 
        function(error) {
            console.log(JSON.stringify(error, null, 2));
        }
    );
}

function load_patients() {
    const patients = require("./patient.json");
    patients.forEach(patient => {
        var record = {
            'uri' : '/patient/' + patient.patient_id,
            'content' : patient,
            'collections' : ['patient']
        };
        insertRecord(record);
    });
}

function load_doctors() {
    const doctors = require("./doctor.json");
    doctors.forEach(doctor => {
        var record = {
            'uri' : '/doctor/' + doctor.doctor_id,
            'content' : doctor,
            'collections' : ['doctor']
        };
        insertRecord(record);
    });
}

function load_treatment() {
    const treatments = require("./treatment.json");
    treatments.forEach(treatment => {
        var record = {
            'uri' : `/treatment/${treatment.patient_id}_${treatment.doctor_id}`,
            'content' : treatment,
            'collections' : ['treatment']
        };
        insertRecord(record);
    });
}

router.get('/load', function (request, response) {
    load_patients();
    load_doctors();
    load_treatment();
    response.send('Database initialized');
});

module.exports = router;