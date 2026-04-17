import React, { useState } from 'react';
import axios from 'axios';

const SomaBrainPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/somabrain/ocr/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setExtractedText(response.data.extracted_text);
    } catch (error) {
      console.error('Error uploading image:', error);
      setExtractedText('Erreur lors de l\'extraction du texte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">SomaBrain - Module OCR</h1>
      <div className="mb-4">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || loading}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Extraction en cours...' : 'Extraire le texte'}
        </button>
      </div>
      {extractedText && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Texte extrait :</h2>
          <pre className="bg-gray-100 p-4 rounded">{extractedText}</pre>
        </div>
      )}
    </div>
  );
};

export default SomaBrainPage;