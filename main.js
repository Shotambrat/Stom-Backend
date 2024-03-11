const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const config = require('config');
const fs = require('fs');
const cors = require('cors'); // Для обработки CORS, если необходимо
const port = config.get('PORT');

const app = express();
const tgBotToken = "6748459440:AAEPxEzc65UWySkUMEeiqzHqL7PeA9WIALg";
const chatId = "-4051287994";

app.use(bodyParser.json()); // Для разбора JSON-запросов
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(cors()); // Используйте CORS, если ваш клиент и сервер на разных доменах/портах

app.post('/submit-form', async (req, res) => {
    let text = '';

    console.log(req.body)

    for (const [key, val] of Object.entries(req.body)) {
        text += `${key}: ${val}\n`;
    }

    if (req.ip === '::1') {
        text += '\nIP: localhost (127.0.0.1)';
    } else {
        text += `\nIP: ${req.ip}`;
    }

    
    text += `\n${new Date().toLocaleString()}`;

    const textMessageUrl = `https://api.telegram.org/bot${tgBotToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}`;

    try {
        await axios.get(textMessageUrl);

        if (req.files) {
            for (const file of Object.values(req.files)) {
                if (isValidFile(file)) {
                    const documentUrl = `https://api.telegram.org/bot${tgBotToken}/sendDocument`;
                    const uniqueFilename = `${Date.now()}_${file.name}`;

                    await file.mv(uniqueFilename);

                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    formData.append('document', fs.createReadStream(uniqueFilename), uniqueFilename);

                    await axios.post(documentUrl, formData, {
                        headers: formData.getHeaders()
                    });

                    fs.unlinkSync(uniqueFilename);
                } else {
                    console.error('Invalid file type or size');
                    return res.status(400).send('Invalid file type or size');
                }
            }
        }

        res.send('Form submitted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error sending message to Telegram');
    }
});

function isValidFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    return allowedTypes.includes(file.mimetype) && file.size <= maxFileSize;
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});