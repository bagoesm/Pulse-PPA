import React, { useState, useEffect } from 'react';
import { RefreshCw, Quote } from 'lucide-react';

interface Quote {
  text: string;
  author: string;
}

interface MotivationCardProps {
  className?: string;
}

const MotivationCard: React.FC<MotivationCardProps> = ({ className = '' }) => {
  const [quote, setQuote] = useState<Quote>({ text: '', author: '' });
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Fungsi untuk mendapatkan gradient berdasarkan hari
  const getDailyGradient = () => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)'
    ];
    
    // Gunakan hari dalam tahun untuk konsistensi gradient harian
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return gradients[dayOfYear % gradients.length];
  };

  // Array quotes lokal sebagai fallback
  const getLocalQuotes = () => {
    const quotes = [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
      { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
      { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
      { text: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
      { text: "Don't be afraid to give yourself everything you've ever wanted in life.", author: "Unknown" },
      { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
      { text: "If life were predictable it would cease to be life, and be without flavor.", author: "Eleanor Roosevelt" },
      { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
      { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
      { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
      { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
      { text: "Your limitation—it's only your imagination.", author: "Unknown" },
      { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
      { text: "Great things never come from comfort zones.", author: "Unknown" },
      { text: "Dream it. Wish it. Do it.", author: "Unknown" },
      { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" }
    ];
    
    // Gunakan hari dalam tahun untuk konsistensi quote harian
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return quotes[dayOfYear % quotes.length];
  };

  // Fungsi untuk mendapatkan quote motivasi
  const fetchQuote = async () => {
    try {
      // Coba beberapa API quotes secara berurutan
      const apis = [
        // ZenQuotes API
        'https://zenquotes.io/api/random',
        // Quotable API (backup)
        'https://api.quotable.io/random?minLength=50&maxLength=150'
      ];
      
      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          let quote = null;
          
          // Handle ZenQuotes format
          if (Array.isArray(data) && data[0]) {
            quote = {
              text: data[0].q || data[0].text,
              author: data[0].a || data[0].author
            };
          }
          // Handle Quotable format
          else if (data.content && data.author) {
            quote = {
              text: data.content,
              author: data.author
            };
          }
          
          if (quote && quote.text && quote.author) {
            setQuote(quote);
            return;
          }
        } catch (apiError) {
          continue;
        }
      }
      
      // Jika semua API gagal, gunakan quote lokal
      const localQuote = getLocalQuotes();
      setQuote(localQuote);
      
    } catch (error) {
      // Fallback ke quote lokal
      const localQuote = getLocalQuotes();
      setQuote(localQuote);
    }
  };

  // Fungsi untuk mendapatkan background image
  const fetchBackgroundImage = async () => {
    try {
      // Generate seed berdasarkan hari untuk variasi harian
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const seed = dayOfYear;
      
      // Coba Picsum Photos terlebih dahulu
      const picsumUrl = `https://picsum.photos/seed/motivation${seed}/800/400`;
      
      // Test load image dengan timeout
      const testImage = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
          const img = new Image();
          const timeout = setTimeout(() => {
            resolve(false);
          }, 5000); // 5 detik timeout
          
          img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
          };
          img.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };
          img.src = url;
        });
      };
      
      const isLoaded = await testImage(picsumUrl);
      if (isLoaded) {
        setBackgroundImage(picsumUrl);
      } else {
        // Jika Picsum gagal, gunakan gradient (tidak set backgroundImage)
        setBackgroundImage('');
      }
      
    } catch (error) {
      console.error('Error fetching background image:', error);
      setBackgroundImage('');
    }
  };

  // Fungsi untuk refresh konten
  const refreshContent = async () => {
    setIsLoading(true);
    await Promise.all([fetchQuote(), fetchBackgroundImage()]);
    setLastUpdate(Date.now());
    setIsLoading(false);
  };

  // Cek apakah sudah berganti hari sejak update terakhir
  const shouldUpdateDaily = (timestamp?: number) => {
    const checkTimestamp = timestamp || lastUpdate;
    if (!checkTimestamp) return true;
    
    const lastUpdateDate = new Date(checkTimestamp);
    const today = new Date();
    
    // Cek apakah tanggal berbeda
    return lastUpdateDate.toDateString() !== today.toDateString();
  };

  // Effect untuk load initial content dan auto-refresh harian
  useEffect(() => {
    const loadContent = async () => {
      const savedQuote = localStorage.getItem('motivationQuote');
      const savedImage = localStorage.getItem('motivationImage');
      const savedTimestamp = localStorage.getItem('motivationTimestamp');

      if (savedQuote && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        setLastUpdate(timestamp);
        
        const shouldUpdate = shouldUpdateDaily(timestamp);
        
        if (!shouldUpdate) {
          // Gunakan data yang tersimpan jika masih hari yang sama
          setQuote(JSON.parse(savedQuote));
          if (savedImage) {
            setBackgroundImage(savedImage);
          }
          setIsLoading(false);
          return;
        }
      }

      // Fetch new content jika tidak ada data tersimpan atau sudah berganti hari
      await refreshContent();
    };

    loadContent();
  }, []);

  // Effect untuk menyimpan data ke localStorage
  useEffect(() => {
    if (quote.text && lastUpdate) {
      localStorage.setItem('motivationQuote', JSON.stringify(quote));
      localStorage.setItem('motivationTimestamp', lastUpdate.toString());
      if (backgroundImage) {
        localStorage.setItem('motivationImage', backgroundImage);
      }
    }
  }, [quote, backgroundImage, lastUpdate]);

  // Auto-refresh setiap hari
  useEffect(() => {
    const checkDailyUpdate = () => {
      if (shouldUpdateDaily()) {
        refreshContent();
      }
    };

    // Cek setiap 10 menit apakah sudah berganti hari
    const interval = setInterval(checkDailyUpdate, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className={`relative overflow-hidden rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {/* Background Image atau Gradient dengan Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundImage 
            ? `url(${backgroundImage})` 
            : getDailyGradient()
        }}
      />
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Content */}
      <div className="relative p-6 text-white min-h-[300px] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Quote size={20} className="text-white/90" />
            <h3 className="text-lg font-bold">Daily Motivation</h3>
          </div>
          <button
            onClick={refreshContent}
            disabled={isLoading}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh quote dan background"
          >
            <RefreshCw size={16} className={`${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Quote Content */}
        <div className="flex-1 flex flex-col justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-white/30 rounded mb-3"></div>
                <div className="h-4 bg-white/30 rounded mb-3 w-3/4 mx-auto"></div>
                <div className="h-4 bg-white/30 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : (
            <>
              <blockquote className="text-lg font-medium leading-relaxed mb-4 text-center">
                "{quote.text}"
              </blockquote>
              <cite className="text-sm text-white/80 text-center font-medium">
                — {quote.author}
              </cite>
            </>
          )}
        </div>


      </div>
    </div>
  );
};

export default MotivationCard;