import React, { useState } from 'react';

const ApiChat = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          system_prompt: "You are a helpful assistant."
        }),
      });

      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      console.error("Error fetching data:", error);
      setResponse("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">AI Assistant Interface</h2>
      
      <form onSubmit={handleAsk} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your Message</label>
          <textarea
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your question here..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Thinking...' : 'Send Request'}
        </button>
      </form>

      {response && (
        <div className="mt-6 p-4 bg-gray-50 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-700">Response:</h3>
          <p className="mt-2 text-gray-800 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
};

export default ApiChat;