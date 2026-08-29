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
      const { doctorsEmail, availableDays, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization } = req.body
      const addData = {
        doctorsEmail, availableDays, consultationFee, doctorName, experience, hospitalName, profileImage, qualifications, specialization, createdAt: new Date(), status: 'active'
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
          availableDays,
          consultationFee,
          doctorName,
          experience,
          hospitalName,
          profileImage,
          qualifications,
          specialization,
          availableSlots
        } = req.body;

        const updateData = {
          doctorsEmail,
          availableDays,
          consultationFee,
          doctorName,
          experience,
          hospitalName,
          profileImage,
          qualifications,
          specialization,
          availableSlots,
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