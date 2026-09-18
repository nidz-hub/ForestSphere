const fs = require("fs");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const { connect, signers } = require("@hyperledger/fabric-gateway");
const crypto = require("crypto");

// ============================================================
// ForestSphere - Hyperledger Fabric Gateway Configuration
// ============================================================

const WSL_FABRIC_PATH =
    "\\\\wsl$\\Ubuntu\\home\\ponnanna\\fabric-samples\\test-network";

const MSP_ID = "Org1MSP";

const CHANNEL_NAME = "mychannel";
const CHAINCODE_NAME = "forestsphere";

const PEER_ENDPOINT = "localhost:7051";
const PEER_HOST_OVERRIDE = "peer0.org1.example.com";

// ============================================================
// Certificate and key paths
// ============================================================

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

// ============================================================
// Helper: find private key
// ============================================================

function findPrivateKey() {
    if (!fs.existsSync(PRIVATE_KEY_DIR)) {
        throw new Error(
            `Fabric private key directory not found: ${PRIVATE_KEY_DIR}`
        );
    }

    const files = fs.readdirSync(PRIVATE_KEY_DIR);

    const keyFile = files.find(
        (file) =>
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

// ============================================================
// Create gRPC connection
// ============================================================

function createGrpcConnection() {
    if (!fs.existsSync(TLS_CERTIFICATE_PATH)) {
        throw new Error(
            `Peer TLS certificate not found: ${TLS_CERTIFICATE_PATH}`
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

// ============================================================
// Create Fabric Gateway connection
// ============================================================

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

    return {
        gateway,
        client
    };
}

// ============================================================
// Get ForestSphere blockchain network
// ============================================================

async function getNetwork() {
    const connection = await createGateway();

    const network = connection.gateway.getNetwork(CHANNEL_NAME);

    return {
        ...connection,
        network
    };
}

// ============================================================
// Submit verified elephant detection
// ============================================================

async function submitVerifiedDetection({
    detectionId,
    zone,
    verifiedBy,
    timestamp,
    status = "VERIFIED"
}) {
    let connection;

    try {
        connection = await getNetwork();

        const contract = connection.network.getContract(
            CHAINCODE_NAME
        );

        const eventType = "ELEPHANT_DETECTION_VERIFIED";

        const result = await contract.submitTransaction(
            "CreateEvent",
            String(detectionId),
            eventType,
            String(zone),
            String(verifiedBy),
            String(timestamp),
            String(status)
        );

        const event = JSON.parse(
            Buffer.from(result).toString("utf8")
        );

        console.log(
            "⛓️ Verified elephant detection recorded on Fabric:",
            event
        );

        return event;
    } catch (error) {
        console.error(
            "❌ Failed to submit event to Hyperledger Fabric:",
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

// ============================================================
// Read one blockchain event
// ============================================================

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
        console.error(
            "❌ Failed to read Fabric event:",
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

// ============================================================
// Get all blockchain events
// ============================================================

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
            "❌ Failed to retrieve Fabric events:",
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

// ============================================================
// Exports
// ============================================================

module.exports = {
    createGateway,
    getNetwork,
    submitVerifiedDetection,
    readEvent,
    getAllEvents
};