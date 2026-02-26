import React, { useState, useEffect } from 'react';
import { RefreshCw, Quote, Languages } from 'lucide-react';

interface Quote {
  text: string;
  author: string;
  translatedText?: string;
}

interface MotivationCardProps {
  className?: string;
}

const MotivationCard: React.FC<MotivationCardProps> = ({ className = '' }) => {
  const [quote, setQuote] = useState<Quote>({ text: '', author: '' });
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [currentGradient, setCurrentGradient] = useState<string>('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Fungsi untuk mendapatkan gradient random
  const getRandomGradient = () => {
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

    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  // Array quotes lokal berkualitas tinggi sebagai fallback
  const getLocalQuotes = () => {
    const quotes = [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
      { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
      { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
      { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
      { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
      { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
      { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
      { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
      { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
      { text: "The mind is everything. What you think you become.", author: "Buddha" },
      { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
      { text: "Two roads diverged in a wood, and I took the one less traveled by, and that made all the difference.", author: "Robert Frost" },
      { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas A. Edison" },
      { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
      { text: "The person who says it cannot be done should not interrupt the person who is doing it.", author: "Chinese Proverb" },
      { text: "There are no traffic jams along the extra mile.", author: "Roger Staubach" },
      { text: "It is never too late to be what you might have been.", author: "George Eliot" },
      { text: "You become what you believe.", author: "Oprah Winfrey" },
      { text: "I would rather die of passion than of boredom.", author: "Vincent van Gogh" },
      { text: "A truly rich man is one whose children run into his arms when his hands are empty.", author: "Unknown" },
      { text: "It is impossible for a man to learn what he thinks he already knows.", author: "Epictetus" },
      { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
      { text: "What we think, we become.", author: "Buddha" },
      { text: "Education costs money. But then so does ignorance.", author: "Sir Claus Moser" },
      { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
      { text: "Every child is an artist. The problem is how to remain an artist once he grows up.", author: "Pablo Picasso" }
    ];

    // Gunakan hari dalam tahun untuk konsistensi quote harian
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return quotes[dayOfYear % quotes.length];
  };

  // Fungsi untuk translate quote ke bahasa Indonesia
  const translateQuote = async (text: string) => {
    try {
      setIsTranslating(true);

      // Menggunakan MyMemory API untuk translate
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|id`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }

      return null;
    } catch (error) {
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  // Fungsi untuk mendapatkan quote motivasi
  const fetchQuote = async () => {
    try {
      // Menggunakan dummyjson api (karena vercel app error)
      const response = await fetch('https://dummyjson.com/quotes/random');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle dummyjson quotes-api format
      if (data.quote && data.author) {
        const newQuote: Quote = {
          text: data.quote,
          author: data.author
        };

        // Auto-translate quote ke bahasa Indonesia
        const translatedText = await translateQuote(data.quote);
        if (translatedText) {
          newQuote.translatedText = translatedText;
        }

        setQuote(newQuote);
        return;
      }

      // Jika API gagal, gunakan quote lokal berkualitas tinggi
      const localQuote = getLocalQuotes();
      const quoteWithTranslation: Quote = { ...localQuote };

      // Auto-translate local quote jika belum ada terjemahan
      const translatedText = await translateQuote(localQuote.text);
      if (translatedText) {
        quoteWithTranslation.translatedText = translatedText;
      }

      setQuote(quoteWithTranslation);

    } catch (error) {
      // Fallback ke quote lokal
      const localQuote = getLocalQuotes();
      const quoteWithTranslation: Quote = { ...localQuote };

      // Auto-translate local quote jika belum ada terjemahan
      try {
        const translatedText = await translateQuote(localQuote.text);
        if (translatedText) {
          quoteWithTranslation.translatedText = translatedText;
        }
      } catch (translateError) {
        // Jika translate gagal, tetap gunakan quote tanpa terjemahan
      }

      setQuote(quoteWithTranslation);
    }
  };

  // Fungsi untuk mendapatkan background image
  const fetchBackgroundImage = async () => {
    try {
      // Generate seed random untuk variasi setiap refresh
      const seed = Math.floor(Math.random() * 10000);

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
    // Update gradient setiap refresh
    setCurrentGradient(getRandomGradient());
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
      // Inisialisasi gradient
      setCurrentGradient(getRandomGradient());

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
            : currentGradient || getRandomGradient()
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
          <div className="flex gap-2">
            {/* Translation Toggle Button */}
            {quote.translatedText && (
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                disabled={isTranslating}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${showTranslation
                    ? 'bg-white/30 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white/90'
                  }`}
                title={showTranslation ? "Tampilkan bahasa Inggris" : "Tampilkan terjemahan Indonesia"}
              >
                <Languages size={16} />
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={refreshContent}
              disabled={isLoading}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh quote dan background"
            >
              <RefreshCw size={16} className={`${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
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
                "{showTranslation && quote.translatedText ? quote.translatedText : quote.text}"
              </blockquote>
              <cite className="text-sm text-white/80 text-center font-medium">
                — {quote.author}
              </cite>

              {/* Translation Status */}
              {isTranslating && (
                <div className="text-center mt-2">
                  <span className="text-xs text-white/60 flex items-center justify-center gap-1">
                    <RefreshCw size={12} className="animate-spin" />
                    Menerjemahkan...
                  </span>
                </div>
              )}

              {/* Language Indicator */}
              {quote.translatedText && (
                <div className="text-center mt-2">
                  <span className="text-xs text-white/60 px-2 py-1 bg-white/10 rounded-full">
                    {showTranslation ? '🇮🇩 Indonesia' : '🇺🇸 English'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>


      </div>
    </div>
  );
};

export default MotivationCard;