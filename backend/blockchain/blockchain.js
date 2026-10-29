
const fs = require("fs");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const { connect, signers } = require("@hyperledger/fabric-gateway");
const crypto = require("crypto");

const WSL_FABRIC_PATH =
    "\\\\wsl$\\Ubuntu\\home\\ponnanna\\fabric-samples\\test-network";

const MSP_ID = "Org1MSP";
const CHANNEL_NAME = "mychannel";
const CHAINCODE_NAME = "forestsphere";

const PEER_ENDPOINT = "localhost:7051";
const PEER_HOST_OVERRIDE = "peer0.org1.example.com";

const CERTIFICATE_PATH = path.join(
    WSL_FABRIC_PATH,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "users",
    "Admin@org1.example.com",
    "msp",
    "signcerts",
    "Admin@org1.example.com-cert.pem"
);

const PRIVATE_KEY_DIR = path.join(
    WSL_FABRIC_PATH,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "users",
    "Admin@org1.example.com",
    "msp",
    "keystore"
);

const TLS_CERTIFICATE_PATH = path.join(
    WSL_FABRIC_PATH,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "peers",
    "peer0.org1.example.com",
    "tls",
    "ca.crt"
);

function findPrivateKey() {
    if (!fs.existsSync(PRIVATE_KEY_DIR)) {
        throw new Error(
            `Fabric private key directory not found: ${PRIVATE_KEY_DIR}`
        );
    }

    const files = fs.readdirSync(PRIVATE_KEY_DIR);

    const keyFile = files.find(
        file =>
            file.endsWith("_sk") ||
            file.endsWith(".pem") ||
            file.includes("priv")
    );

    if (!keyFile) {
        throw new Error(
            `No Fabric private key found in: ${PRIVATE_KEY_DIR}`
        );
    }

    return path.join(PRIVATE_KEY_DIR, keyFile);
}

function createGrpcConnection() {
    if (!fs.existsSync(TLS_CERTIFICATE_PATH)) {
        throw new Error(
            `Fabric TLS certificate not found: ${TLS_CERTIFICATE_PATH}`
        );
    }

    const tlsRootCert = fs.readFileSync(TLS_CERTIFICATE_PATH);
    const credentials = grpc.credentials.createSsl(tlsRootCert);

    return new grpc.Client(
        PEER_ENDPOINT,
        credentials,
        {
            "grpc.ssl_target_name_override": PEER_HOST_OVERRIDE
        }
    );
}

async function createGateway() {
    if (!fs.existsSync(CERTIFICATE_PATH)) {
        throw new Error(
            `Fabric admin certificate not found: ${CERTIFICATE_PATH}`
        );
    }

    const privateKeyPath = findPrivateKey();
    const certificate = fs.readFileSync(CERTIFICATE_PATH);
    const privateKey = fs.readFileSync(privateKeyPath);

    const identity = {
        mspId: MSP_ID,
        credentials: certificate
    };

    const signer = signers.newPrivateKeySigner(
        crypto.createPrivateKey(privateKey)
    );

    const client = createGrpcConnection();

    const gateway = connect({
        client,
        identity,
        signer
    });

    return { gateway, client };
}

async function getNetwork() {
    const connection = await createGateway();
    const network = connection.gateway.getNetwork(CHANNEL_NAME);

    return {
        ...connection,
        network
    };
}

// Generic event writer for supported ForestSphere decisions.
async function submitAuditEvent({
    eventId,
    eventType,
    location,
    decidedBy,
    timestamp,
    status
}) {
    let connection;

    if (
        !eventId ||
        !eventType ||
        !location ||
        !decidedBy ||
        !timestamp
    ) {
        throw new Error(
            "eventId, eventType, location, decidedBy, and timestamp are required."
        );
    }

    const normalizedStatus = String(status || "").toUpperCase();

    if (!["VERIFIED", "REJECTED"].includes(normalizedStatus)) {
        throw new Error("Status must be VERIFIED or REJECTED.");
    }

    try {
        connection = await getNetwork();

        const contract = connection.network.getContract(
            CHAINCODE_NAME
        );

        const result = await contract.submitTransaction(
            "CreateEvent",
            String(eventId),
            String(eventType),
            String(location),
            String(decidedBy),
            String(timestamp),
            normalizedStatus
        );

        const event = JSON.parse(
            Buffer.from(result).toString("utf8")
        );

        console.log(
            `Blockchain audit event recorded (${eventType}):`,
            event
        );

        return event;
    } catch (error) {
        console.error(
            `Failed to record ${eventType} on Fabric:`,
            error.message
        );
        throw error;
    } finally {
        if (connection) {
            connection.gateway.close();
            connection.client.close();
        }
    }
}

// Existing AI Elephant Detection integration.
async function submitDetectionDecision({
    detectionId,
    zone,
    verifiedBy,
    timestamp,
    status
}) {
    const normalizedStatus = String(status || "").toUpperCase();

    if (!["VERIFIED", "REJECTED"].includes(normalizedStatus)) {
        throw new Error(
            "Invalid detection status. Use VERIFIED or REJECTED."
        );
    }

    return submitAuditEvent({
        eventId: detectionId,
        eventType:
            normalizedStatus === "VERIFIED"
                ? "ELEPHANT_DETECTION_VERIFIED"
                : "ELEPHANT_DETECTION_REJECTED",
        location: zone,
        decidedBy: verifiedBy,
        timestamp,
        status: normalizedStatus
    });
}

// New integration for conflict reports and wildlife sightings.
async function submitConservationDecision({
    recordId,
    recordType,
    location,
    decidedBy,
    timestamp,
    status
}) {
    const normalizedType = String(recordType || "").toUpperCase();
    const normalizedStatus = String(status || "").toUpperCase();

    const eventPrefixes = {
        CONFLICT_REPORT: "CONFLICT_REPORT",
        WILDLIFE_SIGHTING: "WILDLIFE_SIGHTING"
    };

    if (!eventPrefixes[normalizedType]) {
        throw new Error(
            "recordType must be CONFLICT_REPORT or WILDLIFE_SIGHTING."
        );
    }

    if (!["VERIFIED", "REJECTED"].includes(normalizedStatus)) {
        throw new Error("Status must be VERIFIED or REJECTED.");
    }

    return submitAuditEvent({
        eventId: `${normalizedType}_${recordId}`,
        eventType: `${eventPrefixes[normalizedType]}_${normalizedStatus}`,
        location,
        decidedBy,
        timestamp,
        status: normalizedStatus
    });
}

async function submitVerifiedDetection({
    detectionId,
    zone,
    verifiedBy,
    timestamp,
    status = "VERIFIED"
}) {
    if (String(status).toUpperCase() !== "VERIFIED") {
        throw new Error(
            "submitVerifiedDetection only accepts VERIFIED status. " +
            "Use submitDetectionDecision for rejected cases."
        );
    }

    return submitDetectionDecision({
        detectionId,
        zone,
        verifiedBy,
        timestamp,
        status: "VERIFIED"
    });
}

async function readEvent(eventId) {
    let connection;

    try {
        connection = await getNetwork();

        const contract = connection.network.getContract(
            CHAINCODE_NAME
        );

        const result = await contract.evaluateTransaction(
            "ReadEvent",
            String(eventId)
        );

        return JSON.parse(
            Buffer.from(result).toString("utf8")
        );
    } catch (error) {
        console.error("Failed to read Fabric event:", error.message);
        throw error;
    } finally {
        if (connection) {
            connection.gateway.close();
            connection.client.close();
        }
    }
}

async function getAllEvents() {
    let connection;

    try {
        connection = await getNetwork();

        const contract = connection.network.getContract(
            CHAINCODE_NAME
        );

        const result = await contract.evaluateTransaction(
            "GetAllEvents"
        );

        return JSON.parse(
            Buffer.from(result).toString("utf8")
        );
    } catch (error) {
        console.error(
            "Failed to retrieve Fabric events:",
            error.message
        );
        throw error;
    } finally {
        if (connection) {
            connection.gateway.close();
            connection.client.close();
        }
    }
}

module.exports = {
    createGateway,
    getNetwork,
    submitAuditEvent,
    submitDetectionDecision,
    submitConservationDecision,
    submitVerifiedDetection,
    readEvent,
    getAllEvents
};