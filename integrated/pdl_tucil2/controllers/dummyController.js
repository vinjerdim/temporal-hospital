'use strict';


exports.show_doctor = function(req, res) {
    res.render(
        'doctor',
        { title: 'Show Doctor'}
    );
};

exports.show_patient = function(req, res) {
    res.render(
        'patient',
        { title: 'Show Patient'}
    );
};

exports.show_specialization = function(req, res) {
    res.render(
        'doctor',
        { title: 'Show Specialization'}
    );
};

exports.show_treatment1 = function(req, res) {
    res.render(
        'treatment1',
        { title: 'Show Latest Treatment'}
    );
};

exports.show_treatment2 = function(req, res) {
    res.render(
        'treatment2',
        { title: 'Show All Treatment'}
    );
};

exports.form_allen = function(req, res) {
    res.render(
        'allen',
        { title: 'Allen\'s Interval'}
    );
};

exports.form_algebra = function(req, res) {
    res.render(
        'algebra',
        { title: 'Temporal Algebra'}
    );
};

exports.form_insert = function(req, res) {
    res.render(
        'insert',
        { title: 'Insert'}
    );
};

exports.form_update = function(req, res) {
    res.render(
        'update',
        { title: 'Update'}
    );
};

exports.form_delete = function(req, res) {
    res.render(
        'delete',
        { title: 'Delete'}
    );
};

