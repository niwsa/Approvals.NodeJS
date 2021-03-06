'use strict';

var fs = require('fs');
var chalk = require('chalk');

exports.verify = function (namer, writer, reporterFactory, options) {

  if (!namer) {
    throw new Error("missing argument 'namer'");
  }
  if (!writer) {
    throw new Error("missing argument 'writer'");
  }
  if (!reporterFactory) {
    throw new Error("missing argument 'reporterFactory'");
  }

  var stripBOM = (options && options.stripBOM);
  var forceApproveAll = (options && options.forceApproveAll);

  var approvedFileName = namer.getApprovedFile(writer.getFileExtension());
  var receivedFileName = namer.getReceivedFile(writer.getFileExtension());

  writer.write(receivedFileName);

  if (forceApproveAll) {
    console.log(chalk.yellow("WARNING: force approving: " + approvedFileName));
    writer.write(approvedFileName);
  }

  var throwReporterError = function (msg) {
    var reporter = reporterFactory();
    var reporterError;
    try {
      reporter.report(approvedFileName, receivedFileName);
    } catch (ex) {
      reporterError = "\nError raised by reporter [" + reporter.name + "]: " + ex + "\n";
    }

    throw new Error((reporterError ? (reporterError + "\n") : "") + msg + ": \nApproved: " + approvedFileName + "\nReceived: " + receivedFileName + '\n');
  };

  if (!fs.existsSync(approvedFileName)) {
    throwReporterError("Approved file does not exist: " + approvedFileName);
  }

  if (!stripBOM) {
    if (fs.statSync(approvedFileName).size !== fs.statSync(receivedFileName).size) {
      throwReporterError("File sizes do not match");
    }
  }

  var approvedFileBuffer = fs.readFileSync(approvedFileName, 'utf8') || "";
  var receivedFileBuffer = fs.readFileSync(receivedFileName, 'utf8') || "";

  // Remove a Byte Order Mark if configured
  if (stripBOM) {
    approvedFileBuffer = approvedFileBuffer.replace(/^\uFEFF/, '');
    receivedFileBuffer = receivedFileBuffer.replace(/^\uFEFF/, '');
  }

  for (var i = 0, bufferLength = approvedFileBuffer.length; i < bufferLength; i++) {
    if (approvedFileBuffer[i] !== receivedFileBuffer[i]) {
      throwReporterError("Files do not match");
    }
  }

  // delete the received file
  fs.unlinkSync(receivedFileName);

  process.emit("approvalFileApproved", approvedFileName);
};
