import React, { useState, useCallback, useEffect } from 'react';
import { extractDataFromImage, isApiConfigured } from './services/geminiService';
import type { TableRow, ExtractedData } from './types';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const convertToCsv = (data: ExtractedData): string => {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  const rows = data.map(row =>
    headers.map(header => `"${(row[header] || '').replace(/"/g, '""')}"`).join(',')
  );
  return [headerRow, ...rows].join('\n');
};

const downloadCsv = (data: ExtractedData) => {
  if (!data || data.length === 0) return;
  const csvString = convertToCsv(data);
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'extracted_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) {
      setConfigError("Configuration Error: The API key is not set. This application is non-functional. Please ensure the API_KEY environment variable is configured for deployment.");
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png')) {
      setImageFile(file);
      setImageDataUrl(URL.createObjectURL(file));
      setExtractedData(null);
    } else {
      setError("Please select a valid image file (JPG, JPEG, PNG).");
      setImageFile(null);
      setImageDataUrl(null);
    }
  };

  const handleExtractData = useCallback(async () => {
    if (configError) return;
    if (!imageFile) {
      setError("Please upload an image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setExtractedData(null);
    try {
      const base64Image = await fileToBase64(imageFile);
      const data = await extractDataFromImage(base64Image, imageFile.type);
      setExtractedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, configError]);
  
  const handleDownload = () => {
    if(extractedData) {
      downloadCsv(extractedData);
    }
  };
  
  const finalError = configError || error;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
          Handwritten Data Extractor
        </h1>
        <p className="mt-2 text-md sm:text-lg text-gray-600 max-w-2xl">
          Upload an image of a handwritten table, and let AI turn it into a downloadable CSV file.
        </p>
      </header>

      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">1. Upload Your Image</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileChange}
              disabled={!!configError}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer text-blue-600 font-semibold hover:text-blue-800 transition-colors ${!!configError && 'opacity-50 cursor-not-allowed'}`}
            >
              Choose a file
            </label>
            <p className="text-xs text-gray-500 mt-1">JPG, JPEG, or PNG</p>
          </div>
          {imageDataUrl && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Image Preview:</h3>
              <img
                src={imageDataUrl}
                alt="Uploaded preview"
                className="w-full max-h-80 object-contain rounded-lg border border-gray-200"
              />
            </div>
          )}
          <div className="mt-6 flex justify-center">
             <button
              onClick={handleExtractData}
              disabled={!imageFile || isLoading || !!configError}
              className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
               {isLoading ? (
                <>
                  <Spinner />
                  Extracting...
                </>
              ) : (
                'Extract Data'
              )}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-gray-800">2. Review & Download</h2>
              <button
                onClick={handleDownload}
                disabled={!extractedData || extractedData.length === 0}
                className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Download CSV
              </button>
          </div>
          <div className="h-96 overflow-auto border border-gray-200 rounded-lg">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Spinner />
                <p className="mt-2 font-medium">AI is analyzing your image...</p>
                 <p className="text-sm">This may take a moment.</p>
              </div>
            )}
            {finalError && (
              <div className="flex items-center justify-center h-full text-red-600 bg-red-50 p-4 rounded-lg">
                <p><span className="font-bold">Error:</span> {finalError}</p>
              </div>
            )}
            {!isLoading && !finalError && !extractedData && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Your extracted data will appear here.</p>
              </div>
            )}
            {extractedData && extractedData.length > 0 && <DataTable data={extractedData} />}
            {extractedData && extractedData.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No data could be extracted. Try a different image.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};


const DataTable: React.FC<{ data: ExtractedData }> = ({ data }) => {
  const headers = Object.keys(data[0]);
  return (
    <table className="w-full text-sm text-left text-gray-700">
      <thead className="text-xs text-gray-800 uppercase bg-gray-100 sticky top-0">
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col" className="px-6 py-3 font-bold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index} className="bg-white border-b hover:bg-gray-50">
            {headers.map((header) => (
              <td key={`${index}-${header}`} className="px-6 py-4">
                {row[header]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Spinner: React.FC = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


export default App;
