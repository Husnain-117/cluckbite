import React from 'react';
import { Check, Award, Clock, Leaf } from 'lucide-react';

const AboutSection = () => {
  const features = [
    {
      icon: Award,
      title: 'Premium Quality',
      description: 'Only the freshest ingredients from trusted local suppliers',
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
    'Halal Certified',
    'Local Ingredients',
  ];

  return (
    <section id="about" className="section-padding bg-background">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Stats Card */}
          <div className="order-2 lg:order-1">
            <div className="bg-card rounded-3xl border border-border p-8 md:p-10">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b border-border">
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-heading font-bold text-primary">10+</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Years</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-3xl md:text-4xl font-heading font-bold text-primary">50K+</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Customers</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-heading font-bold text-primary">4.9</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Rating</p>
                </div>
              </div>

              {/* Commitments */}
              <div className="grid grid-cols-2 gap-3">
                {commitments.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-6 leading-tight">
              Where Every Bite is a{' '}
              <span className="text-primary">Celebration</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Born from a passion for perfect fried chicken, Cluck Bite has been serving up 
              crispy, juicy, and absolutely delicious chicken since day one. Our secret? 
              Premium ingredients, time-honored recipes, and a whole lot of love.
            </p>

            {/* Feature Cards */}
            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
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
