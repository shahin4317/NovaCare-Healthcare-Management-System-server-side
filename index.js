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

    // Send a ping to confirm a successful connection
    app.post('/api/doctors', async (req, res) => {
      const { doctorsEmail, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization } = req.body
      const addData = {
        doctorsEmail, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization, createdAt: new Date(), status: 'active'
      }
      const result = await doctorCollection.insertOne(addData)
      return res.send(result)
    })
    // get the doctor profile 
    app.get('/api/doctors/:email', async (req, res) => {
      const { email } = req.params
      const result = await doctorCollection.findOne({ doctorsEmail: email })
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
          {
            _id: new ObjectId(id)
          },
          {
            $set: updateData
          }
        );

        res.send(result);

      } catch (error) {
        console.error("Update doctor error:", error);

        res.status(500).send({
          message: "Failed to update doctor profile"
        });
      }
    });
    app.post('/api/doctors/:email/schedule', async (req, res) => {
      try {
        const { email } = req.params;

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
            doctorsEmail: email
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
    app.get('/api/doctors/:email/schedule', async (req, res) => {
      const { email } = req.params
      const result = await doctorCollection.findOne({ doctorsEmail: email },
        { projection: { schedule: 1 } })
      res.send(result)
    })
    app.patch("/api/doctors/:id/schedule", async (req, res) => {

      try {
        const { id } = req.params;
        console.log(id, 'ajskdfjkl');

        // Check valid MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid doctor ID",
          });
        }


        const { workingDays, appointmentHours } = req.body;

        // Validate data
        if (
          !Array.isArray(workingDays) ||
          !Array.isArray(appointmentHours)
        ) {
          return res.status(400).send({
            success: false,
            message: "Invalid schedule data",
          });
        }

        const result = await doctorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              schedule: {
                workingDays,
                appointmentHours,
              },
              updatedAt: new Date(),
            },
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
          message: "Schedule updated successfully",
          result,
        });

      } catch (error) {
        console.error("Update doctor schedule error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to update doctor schedule",
          error: error.message,
        });
      }
    });
    app.delete("/api/doctors/:id/schedule", async (req, res) => {
      try {
        const { id } = req.params;

        // Check ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid doctor ID",
          });
        }

        // Only remove schedule
        const result = await doctorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $unset: {
              schedule: "",
            },
            $set: {
              updatedAt: new Date(),
            },
          }
        );

        // Doctor doesn't exist
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
    app.get('/api/doctors', async(req,res)=>{
      const cursore = doctorCollection.find()
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