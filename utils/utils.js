export const generateNumericOTP = (length) => {
    let digits = '123456789';
    let otp = 0; 
  
    for (let i = 0; i < length; i++) {
      otp *= 10; 
      otp += parseInt(digits[Math.floor(Math.random() * digits.length)], 10); 
    }
  
    return otp;
  };

 

  export const extractAndRoundNumber = (str) => {
    
    let cleanedStr = str.replace(/[^0-9.,]/g, '');

  
    let numericValue = parseFloat(cleanedStr.replace(/,/g, ''));

   
    let roundedValue = Math.round(numericValue);

    return roundedValue;
}