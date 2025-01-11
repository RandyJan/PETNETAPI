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
const getPartnerId = async (partnercode)=>{
    try{

        const response = await 
        axios.get('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/partner',{
            headers:{
                'X-Perahub-Gateway-Token':'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                'Accept':'Application/Json'
            }
        });

        var partners = response.data.result;
        var partnerid = partners.filter(x=>x.partner_code == partnercode);
        if(partnerid.length != 0){

            return partnerid[0].id;
        }
        return null;
        
    }catch(error){
        console.error('Error fetching data:', error.message);
    };
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

async function createTransaction(isPayout,status, amount, rawLog, actualLog,phrn,servicefee,totalamount,partnerid) {
    try {
        let arr = {
            status: status,
            amount: amount,
            rawLog: rawLog,
            actualLog: actualLog,
            phrn: phrn
        };
        const date = new Date().toISOString().split('T')[0];
        
        const pool = await sql.connect(config);
        if(!isPayout){
        await pool.request()
            .input('status', sql.NVarChar, status)
            .input('principal_amount', sql.Float, amount)
            .input('rawLog', sql.NVarChar, rawLog)
            .input('actualLog', sql.NVarChar, actualLog)
            .input('phrn', sql.NVarChar, phrn)
            .input('service_fee',sql.Float,servicefee)
            .input('total_amount',sql.Float,totalamount)
            .input('date',sql.Date,date)
            .input('partner_id',sql.NChar,partnerid)
            .query('INSERT INTO transaction_table(status,principal_amount,rawLog,actualLog,phrn,service_fee,total_amount,date,partner_id)VALUES(@status,@principal_amount,@rawLog,@actualLog,@phrn,@service_fee,@total_amount,@date,@partner_id)');
    
        }
        else{

                 await pool.request()
                .input('status', sql.NVarChar, status)
                .input('principal_amount', sql.Float, amount)
                .input('rawLog', sql.NVarChar, rawLog)
                .input('actualLog', sql.NVarChar, actualLog)
                .input('phrn', sql.NVarChar, phrn)
                .input('date',sql.Date,date)
                .query(`
                    UPDATE transaction_table
                    SET 
                        status = @status,
                        principal_amount = @principal_amount,
                        rawLog = @rawLog,
                        actualLog = @actualLog
                    WHERE 
                        phrn = @phrn;
                `)
                
                console.log("transaction output");
        }
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

    if (!principal_amount || !sender_first_name || !receiver_first_name) {s
        return res.status(400).json({ code:400,message: 'Required fields are missing' });
    }

    const transaction = await createTransaction(true,'PENDING', principal_amount, String(req), 'payout request',phrn,null,null,null);

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
        var confirm ='';
        if(apiResponse.data.code == 200){
            
             confirm = await  axios.post('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/receive/confirm',
                {

                    payout_validate_reference_number:apiResponse.data.result.payout_validate_reference_number
                },
             {
                headers: {
                    'X-Perahub-Gateway-Token': 'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                    'Content-Type': 'application/json',
                   'Accept': 'application/json'
                },
            });
            console.log("this is confirm");
            console.log(confirm.data);
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

        return res.status(200).json({code:200,message:'good',result:confirm.data.result});
    } catch (error) {
        console.error('Error processing payout:', error.message);

        await sql.query`UPDATE transaction_table SET status = 'FAILED' WHERE phrn = ${transaction.phrn}`;

        return res.status(500).json({code:500, message: 'Error processing payout', error:String(confirm) });
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
app.post('/api/sendValidate',authenticateJWT, async (req, res) => {
    const {
        partner_reference_number,
        principal_amount,
        service_fee,
        iso_currency,
        iso_originating_country,
        iso_destination_country,
        sender_last_name,
        sender_first_name,
        sender_middle_name,
        receiver_last_name,
        receiver_first_name,
        receiver_middle_name,
        sender_birth_date,
        sender_birth_place,
        sender_birth_country,
        sender_gender,
        sender_relationship,
        sender_purpose,
        sender_source_of_fund,
        sender_occupation,
        sender_employment_nature,
        send_partner_code,
        conversion_rate
    } = req.body;
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
        continue;
    }
    return res.status(500).json({ code: 500,message:"Error",result:a }); 
   
}
    if (!principal_amount || !service_fee || !sender_first_name || !receiver_first_name) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }
    
    const total_amount = parseFloat(principal_amount) + parseFloat(service_fee);


    try {
        const apiResponse = await axios.post('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/send/validate', {
            partner_reference_number,
            principal_amount,
            service_fee,
            iso_currency,
            iso_originating_country,
            iso_destination_country,
            sender_last_name,
            sender_first_name,
            sender_middle_name,
            receiver_last_name,
            receiver_first_name,
            receiver_middle_name,
            sender_birth_date,
            sender_birth_place,
            sender_birth_country,
            sender_gender,
            sender_relationship,
            sender_purpose,
            sender_source_of_fund,
            sender_occupation,
            sender_employment_nature,
            send_partner_code,
            conversion_rate,
        },{
            headers: {
                'X-Perahub-Gateway-Token': 'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
        });
            console.log("print this");
            console.log(String(apiResponse.data));
            // return res.status(200).json({data:apiResponse.data.result.send_validate_reference_number});
            var confirm ='';
            var transaction ='';
        if (apiResponse.status == 200) {
             confirm = await  axios.post('https://privatedrp.dev.perahub.com.ph/v1/remit/dmt/send/confirm',
                {

                    send_validate_reference_number:apiResponse.data.result.send_validate_reference_number
                },
             {
                headers: {
                    'X-Perahub-Gateway-Token': 'MWhkYWoydW5kZGFubl4ldWRhczs0NDQ=',
                    'Content-Type': 'application/json',
                   'Accept': 'application/json'
                },
            });
            var partnerid = await getPartnerId(send_partner_code);
     transaction = await createTransaction(false,'PENDING', principal_amount, String(req+"response:"+apiResponse.data), "Send Validate",confirm.data.result.phrn, service_fee, total_amount,String(partnerid));

            transaction.status = 'PENDING';
            transaction.actualLog = JSON.stringify(apiResponse.data.result); 

        } else {
            transaction.status = 'FAILED';
        }

        transaction.rawLog = JSON.stringify(req.body);

        await sql.connect(config);
        await sql.query`UPDATE transaction_table SET status = ${transaction.status}, rawLog = ${transaction.rawLog}, actualLog = ${transaction.actualLog} WHERE phrn = ${transaction.phrn}`;
        return res.status(200).json({code:200,message:"good",result:confirm.data.result});
        // return res.status(200).json(transaction);
    } catch (error) {
        console.error('Error processing send:', error);

        await sql.query`UPDATE transaction_table SET status = 'FAILED' WHERE phrn = ${transaction.phrn}`;

        return res.status(500).json({ message: 'Error processing send', error: error.message });
    }
});

app.get('/api/transactions',authenticateJWT, async (req, res) => {
    const { startDate, endDate, partnerId, transactionId } = req.query;

    let query = 'SELECT transaction_id,date,principal_amount,total_amount,status,service_fee,partner_id,phrn FROM transaction_table WHERE 1=1'; 

    if (startDate) {
        query += ` AND date >= @startDate`;
    }
    if (endDate) {
        query += ` AND date <= @endDate`;
    }
    if (partnerId) {
        query += ` AND partner_id = @partnerId`;
    }
    if (transactionId) {
        query += ` AND transaction_id = @transactionId`;
    }

    try {
        const pool = await sql.connect(config);
        const request = pool.request();

        if (startDate) request.input('startDate', sql.DateTime, new Date(startDate));
        if (endDate) request.input('endDate', sql.DateTime, new Date(endDate));
        if (partnerId) request.input('partnerId', sql.VarChar, partnerId);
        if (transactionId) request.input('transactionId', sql.Int, transactionId); 

        const result = await request.query(query);
        if(result.recordset.length == 0){
        return res.status(404).json({code:404,message:'Transaction not found',result:result.recordset});

        }
        return res.status(200).json({code:200,message:'Good',result:result.recordset});
    } catch (error) {
        console.error('Error retrieving transactions:', error);
        return res.status(500).json({code:500, message: 'Error retrieving transactions', error: error.message });
    }
});

app.get('/api/logs',authenticateJWT, async (req, res) => {
    const { startDate, endDate, log_type,  } = req.query;
    let query = '';

    if(!log_type){
        return res.status(500).json({code:500,message:'Please input log_type'});
    }
    if(log_type.toLowerCase() =='raw' ){
        query  = 'SELECT rawLog,date from transaction_table WHERE 1=1';
    }else{

        query = 'SELECT actualLog,date FROM transaction_table WHERE 1=1'; 
    }

    if (startDate) {
        query += ` AND date >= @startDate`;
    }
    if (endDate) {
        query += ` AND date <= @endDate`;
    }


    try {
        const pool = await sql.connect(config);
        const request = pool.request();

        if (startDate) request.input('startDate', sql.DateTime, new Date(startDate));
        if (endDate) request.input('endDate', sql.DateTime, new Date(endDate));

        const result = await request.query(query);
        if(result.recordset.length == 0){
        return res.status(404).json({code:404,message:'Logs not found',result:result.recordset});

        }
        return res.status(200).json({code:200,message:'Good',result:result.recordset});
    } catch (error) {
        console.error('Error retrieving logs:', error);
        return res.status(500).json({code:500, message: 'Error retrieving logs', error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});