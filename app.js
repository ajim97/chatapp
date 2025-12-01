import express from "express";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(cors());

// -------------------------------
// CONFIG: Replace with your eSewa test credentials
// -------------------------------
const MERCHANT_CODE = "EPAYTEST";   // Test merchant code
const SECRET_KEY = "8gBm/:&EnhH.1/q"; // Test secret key
const PORT = process.env.PORT || 5000;

// -------------------------------
// HELPER: Generate HMAC SHA256 signature
// -------------------------------
function generateSignature(payload) {
  const dataString = Object.keys(payload)
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join(",");

  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(dataString, "utf8")
    .digest("hex");
}

// -------------------------------
// VERIFY PAYMENT API
// -------------------------------
app.post("/verify-payment", async (req, res) => {
  try {
    const { pid, amt, refId } = req.body;

    if (!pid || !amt || !refId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Payload for signature
    const payload = { amt, pid, rid: refId, scd: MERCHANT_CODE };

    // Generate HMAC signature
    const hash = generateSignature(payload);

    // eSewa sandbox verify URL
    const verifyURL = `https://rc-epay.esewa.com.np/api/epay/transaction/status/?amt=${amt}&pid=${pid}&rid=${refId}&scd=${MERCHANT_CODE}&hash=${hash}`;

    // Call eSewa API
    const response = await axios.get(verifyURL);

    const data = response.data;

    if (data.status === "COMPLETE") {
      return res.json({
        status: "SUCCESS",
        message: "Payment verified successfully",
        esewa: data,
      });
    } else {
      return res.json({
        status: "FAILED",
        message: "Payment verification failed",
        esewa: data,
      });
    }
  } catch (err) {
    console.error("Verify Error:", err.message);
    return res.status(500).json({
      status: "ERROR",
      message: "Server error while verifying payment",
    });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("eSewa Payment Verify Server Running ✅");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
