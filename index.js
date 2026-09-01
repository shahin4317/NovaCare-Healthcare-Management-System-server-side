const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const app = express();
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT
const uri = process.env.MONGO_DB_URI
app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // const database = client.db('novacare-db')
    // const doctorCollection =database.collection('doctor')
    const db = client.db('novacareUser')
    const doctorCollection = db.collection('doctors')
    const appointmentsCollection = db.collection('appointments')
    const paymentCollection = db.collection('payments')

    // Send a ping to confirm a successful connection
    app.post('/api/doctors', async (req, res) => {
      const { doctorId, doctorsEmail, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization } = req.body
      const addData = {
        doctorId, doctorsEmail, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization, createdAt: new Date(), status: 'active'
      }
      const result = await doctorCollection.insertOne(addData)
      return res.send(result)
    })
    // get the doctor profile 
    app.get('/api/doctors/:id', async (req, res) => {
      const { id } = req.params
      const result = await doctorCollection.findOne({ doctorId: id })
      res.send(result)
    })
    //update doctors profile
    app.patch('/api/doctors/:id', async (req, res) => {
      try {
        const { id } = req.params;

        const {
          doctorsEmail,
          consultationFee,
          doctorName,
          experience,
          hospitalName,
          profileImage,
          qualifications,
          specialization,

        } = req.body;

        const updateData = {
          doctorsEmail,
          consultationFee,
          doctorName,
          experience,
          hospitalName,
          profileImage,
          qualifications,
          specialization,

          updatedAt: new Date(),
          status: "active"
        };
        const result = await doctorCollection.updateOne(
          { doctorId: id },
          { $set: updateData }
        );

        res.send(result);

      } catch (error) {
        console.error("Update doctor error:", error);

        res.status(500).send({
          message: "Failed to update doctor profile"
        });
      }
    });
    app.post('/api/doctors/:id/schedule', async (req, res) => {
      try {
        const { id } = req.params;

        const { workingDays, appointmentHours } = req.body;

        if (
          !workingDays ||
          !Array.isArray(workingDays) ||
          workingDays.length === 0 ||
          !appointmentHours ||
          !Array.isArray(appointmentHours) ||
          appointmentHours.length === 0
        ) {
          return res.status(400).send({
            message: "Working days and appointment hours are required"
          });
        }

        const newSchedule = {
          workingDays,
          appointmentHours
        };

        const result = await doctorCollection.updateOne(
          {
            doctorId: id
          },
          {
            $set: {
              schedule: newSchedule,
              updatedAt: new Date()
            }
          }
        );

        console.log("MongoDB result:", result);

        if (result.matchedCount === 0) {
          return res.status(404).send({
            message: "Doctor not found"
          });
        }

        res.status(201).send({
          message: "Schedule added successfully",
          schedule: newSchedule
        });

      } catch (error) {
        console.error("Add schedule error:", error);

        res.status(500).send({
          message: "Failed to add schedule"
        });
      }
    });
    app.get('/api/doctors/:id/schedule', async (req, res) => {
      const { id } = req.params
      const result = await doctorCollection.findOne({ doctorId: id },
        { projection: { schedule: 1 } })
      res.send(result)
    })
    app.patch("/api/doctors/:id/schedule", async (req, res) => {
      try {
        const { id } = req.params;

        const { workingDays, appointmentHours } = req.body;

        if (!Array.isArray(workingDays) || !Array.isArray(appointmentHours)) {
          return res.status(400).send({ success: false, message: "Invalid schedule data" });
        }

        const result = await doctorCollection.updateOne(
          { doctorId: id },   // ✅ ঠিক
          { $set: { schedule: { workingDays, appointmentHours }, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ success: false, message: "Doctor not found" });
        }

        res.send({ success: true, message: "Schedule updated successfully", result });
      } catch (error) {
        console.error("Update doctor schedule error:", error);
        res.status(500).send({ success: false, message: "Failed to update doctor schedule", error: error.message });
      }
    });
    app.delete("/api/doctors/:id/schedule", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await doctorCollection.updateOne(
          { doctorId: id },          // ✅ ঠিক
          {
            $unset: { schedule: "" },
            $set: { updatedAt: new Date() },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Doctor not found",
          });
        }

        res.send({
          success: true,
          message: "Schedule deleted successfully",
        });

      } catch (error) {
        console.error("Delete schedule error:", error);
        res.status(500).send({
          success: false,
          message: "Failed to delete schedule",
        });
      }
    });
    app.get('/api/doctors', async (req, res) => {
      const cursore = doctorCollection.find()
      const result = await cursore.toArray()
      res.send(result)
    })
    app.get('/api/doctors/details/:id', async (req, res) => {
      const { id } = req.params
      const result = await doctorCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)

    })

    //  Appointments related 
    app.post('/api/appointments', async (req, res) => {
      try {
        const {
          patientId,
          patientEmail,
          doctorId,
          doctorName,
          patientName,
          appointmentDate,
          appointmentTime,
          appointmentStatus,
          symptoms,
          consultationFee,
          paymentAmount,
          transactionId,
          paymentStatus
        } = req.body;

        // Check already paid
        const isBookingExit = await appointmentsCollection.findOne({
          transactionId
        });

        if (isBookingExit) {
          return res.status(200).send({
            message: 'already paid'
          });
        }

        // Appointment data
        const addData = {
          patientId,
          patientEmail,

          doctorId,
          doctorName,

          patientName,

          appointmentDate,
          appointmentTime,
          appointmentStatus,
          symptoms,

          consultationFee,

          paymentAmount,
          transactionId,
          paymentStatus,

          bookingDate: new Date()
        };

        // Save appointment
        const appointmentResult = await appointmentsCollection.insertOne(addData);

        // Appointment ID
        const appointmentId = appointmentResult.insertedId;

        // Payment data
        const paymentData = {
          appointmentId,

          patientId,
          doctorId,

          amount: paymentAmount,

          transactionId,

          paymentDate: new Date()
        };

        // Save payment
        const paymentResult = await paymentCollection.insertOne(paymentData);

        res.status(201).send({
          success: true,
          message: "Appointment and payment saved successfully",
          appointmentId: appointmentResult.insertedId,
          paymentId: paymentResult.insertedId
        });

      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to create appointment",
          error: error.message
        });
      }
    });

    app.get("/api/appointments", async (req, res) => {
      try {
        const { doctorId } = req.query;

        console.log("Received doctorId:", doctorId); // ← ডিবাগের জন্য

        if (!doctorId) {
          return res.status(400).send({ message: "doctorId is required" });
        }

        const appointments = await appointmentsCollection
          .find({ doctorId: doctorId })
          .toArray();

        console.log("Found appointments:", appointments.length); // ← কয়টা পাওয়া গেল

        res.send(appointments);
      } catch (error) {
        console.error("Get appointments error:", error);
        res.status(500).send({ message: "Failed to fetch appointments", error: error.message });
      }
    });




    const result = await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
    return result;
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});