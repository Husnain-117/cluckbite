import React from 'react';
import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import MenuPreviewSection from '@/components/landing/MenuPreviewSection';
import AboutSection from '@/components/landing/AboutSection';
import GallerySection from '@/components/landing/GallerySection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import Footer from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <MenuPreviewSection />
      <AboutSection />
      <GallerySection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default Index;
