import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './Firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch MongoDB _id from backend
  const fetchMongoId = async (firebaseUser, userInfo) => {
    try {
      console.log('🔄 Fetching MongoDB _id for user:', firebaseUser.uid);
      
      // Try to get existing user from backend
      const response = await fetch(`http://localhost:5000/api/auth/homeowner/by-uid/${firebaseUser.uid}`);
      
      if (response.ok) {
        const backendData = await response.json();
        console.log('✅ Found existing user in backend:', backendData._id);
        
        // Update Firestore with MongoDB _id
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          _id: backendData._id
        });
        console.log('✅ Updated Firestore with MongoDB _id');
        
        return backendData._id;
      } else if (response.status === 404) {
        console.log('⚠️ User not found in backend, creating...');
        
        // Create user in backend using Firebase auth data
        const createResponse = await fetch('http://localhost:5000/api/auth/homeowner/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: firebaseUser.uid,
            fullName: firebaseUser.displayName || userInfo.fullName || userInfo.displayName || 'Homeowner',
            email: firebaseUser.email || userInfo.email,
            userType: 'homeowner',
            photoURL: firebaseUser.photoURL || userInfo.photoURL || '',
            provider: 'google' // Use 'google' for Firebase users
          })
        });
        
        if (createResponse.ok) {
          const createdData = await createResponse.json();
          console.log('✅ Created user in backend:', createdData._id);
          
          // Update Firestore with MongoDB _id
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            _id: createdData._id
          });
          console.log('✅ Updated Firestore with new MongoDB _id');
          
          return createdData._id;
        }
      }
    } catch (error) {
      console.error('❌ Error fetching MongoDB _id:', error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userInfo = userDoc.data();
            console.log('📥 Firebase user data:', userInfo);
            
            // Check if MongoDB _id is already stored in Firestore
            if (userInfo._id) {
              console.log('✅ MongoDB _id already stored in Firestore:', userInfo._id);
              // Combine Firebase auth data with Firestore data
              const combinedUserData = {
                ...userInfo,
                uid: firebaseUser.uid, // Always include the Firebase UID
                email: firebaseUser.email || userInfo.email,
                displayName: firebaseUser.displayName || userInfo.displayName,
                photoURL: firebaseUser.photoURL || userInfo.photoURL
              };
              setUser(firebaseUser);
              setUserData(combinedUserData);
            } else {
              console.log('🔄 MongoDB _id not found in Firestore, fetching from backend...');
              
              // Fetch MongoDB _id from backend
              const mongoId = await fetchMongoId(firebaseUser, userInfo);
              
              // Combine Firebase data with MongoDB _id
              const combinedUserData = {
                ...userInfo,
                uid: firebaseUser.uid, // Always include the Firebase UID
                email: firebaseUser.email || userInfo.email,
                displayName: firebaseUser.displayName || userInfo.displayName,
                photoURL: firebaseUser.photoURL || userInfo.photoURL,
                _id: mongoId
              };
              
              console.log('✅ Combined user data:', combinedUserData);
              
              setUser(firebaseUser);
              setUserData(combinedUserData);
            }
          } else {
            console.log('⚠️ User document not found in Firestore, using Firebase auth data only');
            
            // Use Firebase auth data and fetch MongoDB _id
            const mongoId = await fetchMongoId(firebaseUser, {});
            
            // Create userData from Firebase auth
            const userDataFromAuth = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              fullName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              userType: 'homeowner',
              _id: mongoId
            };
            
            console.log('✅ Created userData from Firebase auth:', userDataFromAuth);
            
            setUser(firebaseUser);
            setUserData(userDataFromAuth);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('authToken');
      localStorage.removeItem('rememberedUser');
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    userData,
    setUserData,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};