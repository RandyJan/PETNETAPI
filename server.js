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
        return res.status(403).json({ message: "Empty auth"+token,tokken:token });
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
const handlerErr=(arr,val)=>{
    var a;
    switch(arr){
        case 'purpose':
            a = arr.filter(x=>x.purpose_of_remittance ==val);
            if(a.length == 0) return "Invalid data for Sender_purpose";
            break;
            case 'occupation':
                a = arr.filter(x=>x.occupation ==val);
                if(a.length == 0) return "Invalid data sender_occupation";
                break;
                case 'sourcefund':
                a = arr.filter(x=>x.source_of_fund ==val);
                if(a.length == 0) return "Invalid data for sender_source_of_fund";
                break;  
                case 'employment':
                    a = arr.filter(x=>x.employment_nature ==val);
                    if(a.length == 0) return "Invalid data for sender_employment_nature";
                    break;
                    case 'relationship':
                        a = arr.filter(x=>x.relationship ==val);
                        if(a.length == 0) return "Invalid data for sender_relationship";
                        break;
                        case 'partner':
                        a = arr.filter(x=>x.partner_code ==val);
                        if(a.length == 0) return "Invalid data for send_partner_code";
                        break;

                    }
                    return 0;
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
  
//   const valpurpose = purpose.filter(x=>x.purpose_of_remittance == sender_purpose);
  if(valpurpose.length == 0){
    return res.status(404).json({message:"invalid data"});
  }
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
                    .query('INSERT INTO [transaction] (partner_reference_number,principal_amount,service_fee, iso_currency,conversion_rate,iso_originating_country,iso_destination_country, sender_last_name, sender_first_name,sender_middle_name,receiver_last_name,receiver_first_name,receiver_middle_name,sender_birth_date,sender_birth_place,sender_birth_country,sender_gender,sender_relationship,sender_purpose,sender_source_of_fund,sender_occupation,sender_employment_nature,send_partner_code) VALUES (@partner_reference_number,@principal_amount,@service_fee, @iso_currency,@conversion_rate,@iso_originating_country,@iso_destination_country, @sender_last_name, @sender_first_name,@sender_middle_name,@receiver_last_name,@receiver_first_name,@receiver_middle_name,@sender_birth_date,@sender_birth_place,@sender_birth_country,@sender_gender,@sender_relationship,@sender_purpose,@sender_source_of_fund,@sender_occupation,@sender_employment_nature,@send_partner_code)');
                    res.status(201).json({ message: 'Data inserted successfully', result });
    }catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ message: 'Error inserting data', error: err.message });
    } finally {
        await sql.close();
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});