import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Profile() {
  const navigate = useNavigate();
  const[loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Select',
    city: '',
    state: '',
    preferred_language: 'English',
    allergies: '',
    chronic_conditions: '',
    medications: '',
    smoking_status: 'No',
    alcohol_status: 'No',
    sleep_pattern: 'Average',
    diet_pattern: 'Mixed',
    exercise_level: 'None',
    previous_surgeries: '',
    family_history: '',
    emergency_contact: ''
  });

  // Fetch existing profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/profile/');
        // If profile exists in DB, populate the form
        if (data && Object.keys(data).length > 0) {
          setFormData(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  },[]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Ensure age is stored as a number
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'age' ? Number(value) : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/profile/', formData);
      alert('Profile updated successfully!');
      navigate('/chat'); // Redirect back to chat after saving
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Medical Profile</h2>
          <button 
            onClick={() => navigate('/chat')}
            className="text-white hover:text-gray-200 text-sm font-medium underline"
          >
            Back to Chat
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Section 1: Basic Info */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-800">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} className={inputClass} required min="0" max="120" />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass} required>
                  <option value="Select">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Preferred Language</label>
                <select name="preferred_language" value={formData.preferred_language} onChange={handleChange} className={inputClass}>
                  {['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} className={inputClass} required />
              </div>
            </div>
          </div>

          {/* Section 2: Medical History */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-800">Medical History</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>Allergies (if any)</label>
                <input type="text" name="allergies" value={formData.allergies} onChange={handleChange} placeholder="e.g., Peanuts, Penicillin" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Chronic Conditions</label>
                <input type="text" name="chronic_conditions" value={formData.chronic_conditions} onChange={handleChange} placeholder="e.g., Diabetes, Asthma" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Current Medications</label>
                <input type="text" name="medications" value={formData.medications} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Previous Surgeries</label>
                <input type="text" name="previous_surgeries" value={formData.previous_surgeries} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Family Medical History</label>
                <textarea name="family_history" value={formData.family_history} onChange={handleChange} className={inputClass} rows="2"></textarea>
              </div>
            </div>
          </div>

          {/* Section 3: Lifestyle */}
          <div>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-800">Lifestyle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Smoking Status</label>
                <select name="smoking_status" value={formData.smoking_status} onChange={handleChange} className={inputClass}>
                  <option value="No">No</option>
                  <option value="Occasionally">Occasionally</option>
                  <option value="Regularly">Regularly</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Alcohol Status</label>
                <select name="alcohol_status" value={formData.alcohol_status} onChange={handleChange} className={inputClass}>
                  <option value="No">No</option>
                  <option value="Occasionally">Occasionally</option>
                  <option value="Regularly">Regularly</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Sleep Pattern</label>
                <select name="sleep_pattern" value={formData.sleep_pattern} onChange={handleChange} className={inputClass}>
                  <option value="Poor">Poor (Under 5 hrs)</option>
                  <option value="Average">Average (5-7 hrs)</option>
                  <option value="Good">Good (7+ hrs)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Exercise Level</label>
                <select name="exercise_level" value={formData.exercise_level} onChange={handleChange} className={inputClass}>
                  <option value="None">None</option>
                  <option value="Light">Light</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Active">Active</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 transition duration-300 disabled:bg-blue-400"
            >
              {loading ? 'Saving Profile...' : 'Save Profile & Continue'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}