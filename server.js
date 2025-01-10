const express = require('express');
const sql = require('mssql');
const Joi = require('joi');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');
const cors = require('cors');
app.use(express.json());
const bodyParser = require('body-parser'); 

const config = {
    user:'sa',
    password:'p@$$w0rd',
    server:'localhost',
    database:'PETNETDB',
    options:{
        encrypt:false,
        trustServerCertificate:true
    }
};
const JWT_KEY = 'Petnet123';
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ code:403, message: "unauthorized client" });
    }

    jwt.verify(token, JWT_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: "Token does not match",
                token: token,
                JWT: JWT_KEY,
                error: err.message 
            });
        }
        req.user = user;
        next();
    });
};
const validateinputs = async (field)=>{
    try{

        const response = await 
        axios.get('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/'+field,{
            headers:{
                'X-Perahub-Gateway-Token':'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                'Accept':'Application/Json'
            }
        });
        return response.data.result;
        
    }catch(error){
        console.error('Error fetching data:', error.message);
    };
};
function generateReferenceNumber() {
    const timestamp = Date.now();
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    return `${timestamp}-${randomNum}`;
};
function generatephrn(length = 12) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters[randomIndex];
    }

    return randomString;
};

const handlerErr=(arr,arrname,val)=>{
    var a;
    
    
    switch(arrname){
        case 'purpose':
            a = arr.filter(x=>x.purpose_of_remittance ==val);
            if(a.length == 0) return "Invalid data for Sender_purpose";
            break;
            case 'occupation':
                a = arr.filter(x=>x.occupation ==val);
                if(a.length == 0) return "Invalid data sender_occupation";
                break;
                case 'sof':
                a = arr.filter(x=>x.source_of_fund ==val);
                if(a.length == 0) return "Invalid data for sender_source_of_fund";
                break;  
                case 'employment':
                    a = arr.filter(x=>x.employment_nature ==val);
                    if(a.length == 0) return "Invalid data for sender_employment_nature";
                    break;
                    case 'rel':
                        a = arr.filter(x=>x.relationship ==val);
                        if(a.length == 0) return "Invalid data for sender_relationship";
                        break;
                        case 'partner':
                        a = arr.filter(x=>x.partner_code ==val);
                        if(a.length == 0) return "Invalid data for send_partner_code";
                        break;

                    }
                    return 'null';
}
app.use(cors());
app.use(bodyParser.json());
app.post('/api/validate',authenticateJWT,async (req,res)=>{
    // const  {error} = schema.validate(req.body);
    // if(error){
    //     return  res.status(400).json({ message: 'Validation error', details: error.details });
    // }
    const {partner_reference_number,principal_amount,service_fee,
        iso_currency,conversion_rate,iso_originating_country,iso_destination_country,
        sender_last_name, sender_first_name,sender_middle_name,receiver_last_name,receiver_first_name,
        receiver_middle_name,sender_birth_date,sender_birth_place,sender_birth_country,sender_gender
        ,sender_relationship,sender_purpose,sender_source_of_fund,sender_occupation,sender_employment_nature,
        send_partner_code
    }=req.body;
    var purpose = await validateinputs('purpose');
    var occupation = await validateinputs('occupation');
    var sof = await validateinputs('sourcefund');
    var employment= await validateinputs('employment');
    var rel = await validateinputs('relationship');
    var partner = await validateinputs('partner');
    
var test = [purpose, 'purpose', sender_purpose];
var test1 = [occupation, 'occupation', sender_occupation];
var test2 = [sof, 'sof', sender_source_of_fund];
var test3 = [employment, 'employment', sender_employment_nature];
var test4 = [rel, 'rel', sender_relationship];
var test5 = [partner, 'partner', send_partner_code];
var allArr = [test, test1,test2,test3,test4,test5];
for (const element of allArr) {
    const a = handlerErr(element[0], element[1], element[2]);
    if (!a.includes("Invalid")) {
        continue;// Send response and exit
    }
    return res.status(500).json({ code: 500,message:"Error",result:a }); 
   
}
// handlerErr(sof,'sof',sender_source_of_fund);

// handlerErr(employment,'employment',sender_employment_nature);
// handlerErr(rel,'rel',sender_relationship);
// handlerErr(partner,'partner',send_partner_code);
//   if(valpurpose.length == 0){
//     return res.status(404).json({message:"invalid data"});
//   }
const refnum = generateReferenceNumber();
    try{
        let pool = await sql.connect(config);
        let result = await pool.request()
                    .input('partner_reference_number', sql.NVarChar,partner_reference_number)
                    .input('principal_amount',sql.Int,principal_amount)
                    .input('service_fee',sql.Int,service_fee)
                    .input('iso_currency', sql.NVarChar,iso_currency)
                    .input('conversion_rate',sql.NVarChar,conversion_rate)
                    .input('iso_originating_country', sql.NVarChar,iso_originating_country)
                    .input('iso_destination_country',sql.NVarChar,iso_destination_country)
                    .input('sender_last_name',sql.NVarChar,sender_last_name)
                    .input('sender_first_name',sql.NVarChar,sender_first_name)
                    .input('sender_middle_name',sql.NChar,sender_middle_name)
                    .input('receiver_last_name',sql.NVarChar,receiver_last_name)
                    .input('receiver_first_name',sql.NVarChar,receiver_first_name)
                    .input('receiver_middle_name',sql.NChar,receiver_middle_name)
                    .input('sender_birth_date',sql.Date,sender_birth_date)
                    .input('sender_birth_place',sql.NVarChar,sender_birth_place)
                    .input('sender_birth_country',sql.NChar,sender_birth_country)
                    .input('sender_gender',sql.NChar,sender_gender)
                    .input('sender_relationship',sql.NVarChar,sender_relationship)
                    .input('sender_purpose',sql.NVarChar,sender_purpose)
                    .input('sender_source_of_fund',sql.NVarChar,sender_source_of_fund)
                    .input('sender_occupation',sql.NVarChar,sender_occupation)
                    .input('sender_employment_nature',sql.NVarChar,sender_employment_nature)
                    .input('send_partner_code',sql.NVarChar,send_partner_code)
                    .input('send_validate_reference_number',sql.NVarChar,refnum)
                    .query('INSERT INTO [transaction] (partner_reference_number,principal_amount,service_fee, iso_currency,conversion_rate,iso_originating_country,iso_destination_country, sender_last_name, sender_first_name,sender_middle_name,receiver_last_name,receiver_first_name,receiver_middle_name,sender_birth_date,sender_birth_place,sender_birth_country,sender_gender,sender_relationship,sender_purpose,sender_source_of_fund,sender_occupation,sender_employment_nature,send_partner_code,send_validate_reference_number) VALUES (@partner_reference_number,@principal_amount,@service_fee, @iso_currency,@conversion_rate,@iso_originating_country,@iso_destination_country, @sender_last_name, @sender_first_name,@sender_middle_name,@receiver_last_name,@receiver_first_name,@receiver_middle_name,@sender_birth_date,@sender_birth_place,@sender_birth_country,@sender_gender,@sender_relationship,@sender_purpose,@sender_source_of_fund,@sender_occupation,@sender_employment_nature,@send_partner_code,@send_validate_reference_number)');
                   
                    res.status(201).json({ code:201, message: 'Good', result:"send_validate_reference_number:"+refnum});
    }catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ code:500,message: 'Error inserting data', error: err.message });
    } finally {
        await sql.close();
    }
});
// app.post('/api/confirm',authenticateJWT,async (req,res)=>{
//     const {validate_reference_number}= req.body;


// });
app.post('/api/confirm',authenticateJWT, async (req, res) => {
    const { validate_reference_number} = req.body;
    const phrnumber = generatephrn();
    try {
        await sql.connect(config);

        // Update query
        const result = await sql.query`UPDATE [transaction] SET isconfirm = 1,phrn = ${phrnumber} WHERE send_validate_reference_number = ${validate_reference_number}`;
   
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ code:404,message: 'Not found' });
        }

      return  res.status(200).json({code:200, message: 'Successful',result:"phrn:"+phrnumber });
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).json({code:500, message: 'An error occurred while updating the item',result:err });
    } finally {
        await sql.close();
    }
});
// app.post('/api/inquiry',authenticateJWT,async(req,res)=>{
//     const {phrn,send_partner_code}=req.body;
//     try {
//         await sql.connect(config);

//         const result = await sql.query`SELECT phrn FROM [transaction] WHERE isConfirm = 1 AND phrn = ${phrn}`;
//         const data = await sql.query`SELECT * FROM [transaction] WHERE phrn = ${phrn}`;
//         if (result.recordset.length === 0) {
//             if(data.recordset.length === 0){
//             return res.status(200).json({ code:404,message: 'Not found',result:data.recordset });
//             }
//             return res.status(200).json({ code:200,message: 'Good',result:data.recordset });
//         }

//        return res.status(405).json({code:405,message:'PeraHUB Reference Number (PHRN) is already Received.',result:result.recordset});
//     } catch (err) {
//         console.error('SQL error', err);
//         res.status(500).json({code:500, message: 'An error occurred while retrieving the data' });
//     } finally {
//         await sql.close();
//     }

// })
async function createTransaction(status, amount, rawLog, actualLog,phrn) {
    try {
        let arr = {
            status: status,
            amount: amount,
            rawLog: rawLog,
            actualLog: actualLog,
            phrn: phrn
        };
        

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('status', sql.NVarChar, status)
            .input('amount', sql.Float, amount)
            .input('rawLog', sql.NVarChar, rawLog)
            .input('actualLog', sql.NVarChar, actualLog)
            .input('phrn', sql.NVarChar, phrn)
            .query('INSERT INTO transaction_table(status,amount,rawLog,actualLog,phrn)VALUES(@status,@amount,@rawLog,@actualLog,@phrn)');
            console.log("transaction output");
            console.log(arr);
            return arr;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}
app.post('/api/payout',authenticateJWT, async (req, res) => {
    const {
        phrn,
        principal_amount,
        iso_originating_country,
        iso_destination_country,
        sender_last_name,
        sender_first_name,
        sender_middle_name,
        receiver_last_name,
        receiver_first_name,
        receiver_middle_name,
        payout_partner_code,
    } = req.body;

    // Validate input
    if (!principal_amount || !sender_first_name || !receiver_first_name) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }

    // Create a pending transaction
    const transaction = await createTransaction('PENDING', principal_amount, String(req), 'payout request',phrn);

    try {
        const apiResponse = await axios.post('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/receive/validate', 
            {  phrn: phrn,
                principal_amount: principal_amount,
                iso_originating_country: iso_originating_country,
                iso_destination_country: iso_destination_country,
                sender_last_name: sender_last_name,
                sender_first_name: sender_first_name,
                sender_middle_name: sender_middle_name,
                receiver_last_name: receiver_last_name,
                receiver_first_name: receiver_first_name,
                receiver_middle_name: receiver_middle_name,
                payout_partner_code: payout_partner_code,
            },
     
        {
            headers: {
                'X-Perahub-Gateway-Token': 'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
        
        });
        console.log("this");
        console.log(apiResponse.data);
        if(apiResponse.data.code == 200){
            
            const confirm = await  axios.post('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/receive/confirm',
                {

                    payout_validate_reference_number:apiResponse.result.payout_validate_reference_number
                },
             {
                headers: {
                    'X-Perahub-Gateway-Token': 'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                    'Content-Type': 'application/json',
                   'Accept': 'application/json'
                },
            });
        }

        if (apiResponse.data.code === 200) {
            transaction.status = 'SUCCESS';
            transaction.actualLog = JSON.stringify(apiResponse.data.result); 
            transaction.rawLog = JSON.stringify(req.body); 
        } else {
            transaction.status = 'FAILED';
        }

        await sql.connect(config);
        await sql.query`UPDATE transaction_table SET status = ${transaction.status}, rawLog = ${transaction.rawLog}, actualLog = ${transaction.actualLog} WHERE phrn = ${transaction.phrn}`;

        return res.status(200).json(transaction);
    } catch (error) {
        console.error('Error processing payout:', error.message);

        await sql.query`UPDATE transaction_table SET status = 'FAILED' WHERE phrn = ${transaction.phrn}`;

        return res.status(500).json({ message: 'Error processing payout', error: error });
    }
});


app.post('/api/inquire',authenticateJWT, async (req, res) => {
    const { phrn,send_partner_code } = req.body;

    if (!phrn||!send_partner_code) {
        return res.status(400).json({ message: 'all field is required' });
    }

    try {
        const response = await axios.post('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/inquire', 
            {
                phrn: phrn,
                send_partner_code: send_partner_code
            },
            {
                headers: {
                    'X-Perahub-Gateway-Token': 'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
              
            }
        );
       return res.status(200).json(response.data);
    } catch (error) {

        if (error.response) {
            return res.status(500).json(error.response.data);
        } else if (error.request) {
            return res.status(404).json({ code:404,message: 'No response from INQUIRY API' });
        } else {
            return res.status(500).json({ code:500,message: 'Error in request setup' });
        }
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});