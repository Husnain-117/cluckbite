import React from 'react';
import { Check, Award, Clock, Leaf } from 'lucide-react';

const AboutSection = () => {
  const features = [
    {
      icon: Award,
      title: 'Premium Quality',
      description: 'Only the freshest ingredients, sourced from trusted suppliers',
    },
    {
      icon: Clock,
      title: 'Fast Service',
      description: 'Quick preparation without compromising on quality',
    },
    {
      icon: Leaf,
      title: 'Fresh Daily',
      description: 'All our food is prepared fresh every single day',
    },
  ];

  const commitments = [
    '100% Fresh Chicken',
    'Secret Family Recipes',
    'Made to Order',
    'Quality Guaranteed',
  ];

  return (
    <section id="about" className="section-padding">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image/Visual Side */}
          <div className="relative order-2 lg:order-1">
            <div className="relative">
              {/* Background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
              
              {/* Main image area */}
              <div className="relative bg-card rounded-3xl p-8 border border-border">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-muted to-background flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-9xl">👨‍🍳</span>
                    <p className="text-xl font-heading font-bold mt-4 gradient-text">
                      Chef's Special
                    </p>
                  </div>
                </div>

                {/* Stats overlay */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5">
                  <div className="bg-primary rounded-2xl p-4 flex justify-around text-primary-foreground">
                    <div className="text-center">
                      <p className="text-3xl font-heading font-bold">10+</p>
                      <p className="text-sm opacity-90">Years</p>
                    </div>
                    <div className="w-px bg-primary-foreground/30" />
                    <div className="text-center">
                      <p className="text-3xl font-heading font-bold">50K+</p>
                      <p className="text-sm opacity-90">Customers</p>
                    </div>
                    <div className="w-px bg-primary-foreground/30" />
                    <div className="text-center">
                      <p className="text-3xl font-heading font-bold">4.9</p>
                      <p className="text-sm opacity-90">Rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div className="order-1 lg:order-2">
            <span className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm mb-4">
              Our Story
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">
              Where Every Bite is a{' '}
              <span className="gradient-text">Celebration</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Born from a passion for perfect fried chicken, Cluck Bite has been serving up 
              crispy, juicy, and absolutely delicious chicken since day one. Our secret? 
              Premium ingredients, time-honored recipes, and a whole lot of love.
            </p>

            {/* Commitments */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {commitments.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* Feature Cards */}
            <div className="grid gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
