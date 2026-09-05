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
    const userCollection = db.collection('user')
    const doctorCollection = db.collection('doctors')
    const appointmentsCollection = db.collection('appointments')
    const paymentCollection = db.collection('payments')
    const prescriptionCollection = db.collection('prescriptions')


    // Send a ping to confirm a successful connection
    app.post('/api/doctors', async (req, res) => {
      const { doctorId, doctorsEmail, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization } = req.body
      const addData = {
        doctorId, doctorsEmail, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization, createdAt: new Date(), status: 'not verified'
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
          status: "Not Verified"
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
          { doctorId: id },
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
    //for overveiw page 
    app.get("/api/appointments/patient/:patientId", async (req, res) => {
      try {
        const { patientId } = req.params

        console.log("Received patientId:", patientId); // ← ডিবাগের জন্য

        if (!patientId) {
          return res.status(400).send({ message: "patientId is required" });
        }

        const appointments = await appointmentsCollection
          .find({ patientId: patientId })
          .toArray();

        console.log("Found appointments:", appointments.length); // ← কয়টা পাওয়া গেল

        res.send(appointments);
      } catch (error) {
        console.error("Get appointments error:", error);
        res.status(500).send({ message: "Failed to fetch appointments", error: error.message });
      }
    });
    //for patient 
    app.get("/api/payments/:patientId", async (req, res) => {
      const { patientId } = req.params
      const result = await paymentCollection.find({ patientId: patientId }).toArray()
      res.send(result)
    })
    // for doctors appionmentspage
    app.get('/api/appointments/doctor/:doctorId', async (req, res) => {
      const { doctorId } = req.params
      console.log(doctorId, 'form database');
      const result = await appointmentsCollection.find({ doctorId: doctorId }).toArray()
      res.send(result)
    })

    app.patch('/api/appointments/:id/status', async (req, res) => {
      const { id } = req.params
      const updateRequest = req.body
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          appointmentStatus: updateRequest.appointmentStatus
        }
      }
      const result = await appointmentsCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.patch('/api/appointments/:appointmentId', async (req, res) => {
      try {
        const { appointmentId } = req.params;

        const {
          appointmentDate,
          appointmentTime,
          symptoms,
          appointmentStatus
        } = req.body;

        const filter = {
          _id: new ObjectId(appointmentId)
        };

        const updateDoc = {
          $set: {
            appointmentDate,
            appointmentTime,
            symptoms,
            appointmentStatus
          }
        };

        const result = await appointmentsCollection.updateOne(
          filter,
          updateDoc
        );

        res.send(result);

      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to update appointment"
        });
      }
    });

    // for prescriptions
    app.get("/api/appointments/:appointmentId", async (req, res) => {

      const { appointmentId } = req.params;

      const result = await appointmentsCollection.findOne({
        _id: new ObjectId(appointmentId)
      });

      res.send(result);
    });
    // for prsscriptions
    app.post('/api/prescriptions', async (req, res) => {
      const { appointmentId,
        patientName,
        diagnosis,
        medicine,
        advice,
        doctorId, } = req.body
      const addData = {
        appointmentId,
        patientName,
        diagnosis,
        medicine,
        advice,
        doctorId, createdAt: new Date()
      }
      const result = await prescriptionCollection.insertOne(addData)
      return res.send(result)


    })
    app.get("/api/prescriptions/:appointmentId", async (req, res) => {
      try {
        const { appointmentId } = req.params;

        const prescription = await prescriptionCollection.findOne({
          appointmentId: appointmentId,
        });

        if (!prescription) {
          return res.status(404).send({
            message: "Prescription not found",
          });
        }

        res.send(prescription);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to get prescription",
        });
      }
    });

    // for admin 
    app.get('/api/user', async (req, res) => {
      const cursore = userCollection.find()
      const result = await cursore.toArray()
      res.send(result)

    })
    app.delete("/api/user/:id", async (req, res) => {
      try {
        const { id } = req.params;

        ;

        const result = await userCollection.deleteOne({
          _id: new ObjectId(id),
        });



        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        res.send({
          success: true,
          message: "User deleted successfully",
        });

      } catch (error) {


        res.status(500).send({
          success: false,
          message: "Failed to delete user",
        });
      }
    });
    app.get('/api/payments', async (req, res) => {

      const cursore = paymentCollection.find()
      const result = await cursore.toArray()
      res.send(result)
    })

    app.get('/api/appointments', async (req, res) => {
      const cursore = appointmentsCollection.find()
      const result = await cursore.toArray()
      res.send(result)
    })


    app.patch("/api/doctor/status/:id", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("User ID received:", id);

        // Find doctor using BetterAuth user ID
        const doctor = await doctorCollection.findOne({
          doctorId: id,
        });

        console.log("Doctor found:", doctor);

        if (!doctor) {
          return res.status(404).send({
            success: false,
            message: "Doctor not found",
          });
        }

        // Toggle status
        const newStatus =
          doctor.status === "Active"
            ? "Not Verified"
            : "Active";

        const result = await doctorCollection.updateOne(
          {
            doctorId: id,
          },
          {
            $set: {
              status: newStatus,
              updatedAt: new Date(),
            },
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Status was not updated",
          });
        }

        return res.status(200).send({
          success: true,
          message:
            newStatus === "Active"
              ? "Doctor verified successfully"
              : "Doctor verification cancelled",
          status: newStatus,
        });
      } catch (error) {
        console.error(
          "Doctor status update error:",
          error
        );

        return res.status(500).send({
          success: false,
          message: "Failed to update doctor status",
        });
      }
    });
   app.get('/api/appointments', async (req, res) => {
      const cursore = appointmentsCollection.find()
      const result = await cursore.toArray()
      res.send(result)

    })




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