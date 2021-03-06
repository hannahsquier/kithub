require 'securerandom'

class Course < ApplicationRecord
  before_save :create_identifier

  validates :title, presence: true

  belongs_to :teacher

  #one to many relationship for assignments
  has_many :assignments, dependent: :destroy

  #many to many relationship for students
  has_many :student_courses, dependent: :destroy
  has_many :students, through: :student_courses

  has_many :course_days
  has_many :lesson_plans, through: :course_days, class_name: "LessonPlan", source: :lesson_plans




  def points_possible
    points = 0
    self.assignments.each do |assignment|
      points += assignment.possible_score
    end
    points
  end

  def assignment_ids
    self.assignments.map{|assignment|assignment.id}.join(", ")
  end

  def update_course_days
    daySec = 86400
    meeting_days = JSON.parse(self.meeting_days)
    course_day_hash = build_course_day_hash
    days_to_add = build_days_to_add(meeting_days)
    current_date = self.start_date
    while current_date <= self.end_date
      days_to_add.each do |days_ahead|
        new_date = current_date + (daySec * days_ahead)
        if new_date <= self.end_date && !course_day_hash[new_date]
          self.course_days.create(date: (new_date))
        end
      end
      current_date += (7 * daySec)
    end
    remove_inactive_days(meeting_days)
  end

  def build_course_day_hash
    day_hash = {}
    self.course_days.each do |course_day|
      day_hash[course_day.date] = 1
    end
    day_hash
  end

  def build_days_to_add(meet_days)
    days_array = []
    meet_days.each do |day|
      if day.to_i < self.start_date.wday.to_i
        days_array.push((7 - self.start_date.wday.to_i + day.to_i))
      else
        days_array.push(day.to_i - self.start_date.wday.to_i)
      end
    end
    puts "Days array: #{days_array}"
    return days_array
  end

  def remove_inactive_days(meeting_days)
    self.course_days.each do |course_day|
      if course_day.date > self.end_date || course_day.date < self.start_date || !meeting_days.include?(course_day.date.wday.to_s)
        puts course_day.date.wday
        course_day.delete
      end
    end
  end

  def create_identifier
    self.identifier = SecureRandom.hex(4) + self.id.to_s
  end

end
